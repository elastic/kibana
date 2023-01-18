/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { useLocation, useParams, useHistory } from 'react-router-dom';

import { uniq, xorBy } from 'lodash';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import type { IntegrationPreferenceType } from '../../../components/integration_preference';
import { usePackages, useCategories, useStartServices } from '../../../../../hooks';
import {
  useGetAppendCustomIntegrations,
  useGetReplacementCustomIntegrations,
  useLink,
} from '../../../../../hooks';
import { useMergeEprPackagesWithReplacements } from '../../../../../hooks/use_merge_epr_with_replacements';

import type { CategoryParams } from '..';
import { getParams, mapToCard } from '..';
import type { PackageList, PackageListItem } from '../../../../../types';

import { doesPackageHaveIntegrations } from '../../../../../services';

import {
  isInputOnlyPolicyTemplate,
  isIntegrationPolicyTemplate,
} from '../../../../../../../../common/services';

import { pagePathGetters } from '../../../../../constants';

import type { IntegrationCardItem } from '../../../../../../../../common/types/models';

import { ALL_CATEGORY } from '../category_facets';
import type { CategoryFacet } from '../category_facets';

import { mergeCategoriesAndCount } from '../util';

export interface IntegrationsURLParameters {
  searchString?: string;
  categoryId?: string;
  subCategoryId?: string;
}

function getAllCategoriesFromIntegrations(pkg: PackageListItem) {
  if (!doesPackageHaveIntegrations(pkg)) {
    return pkg.categories;
  }

  const allCategories = pkg.policy_templates?.reduce((accumulator, policyTemplate) => {
    if (isInputOnlyPolicyTemplate(policyTemplate)) {
      // input only policy templates do not have categories
      return accumulator;
    }
    return [...accumulator, ...(policyTemplate.categories || [])];
  }, pkg.categories || []);

  return uniq(allCategories);
}

// Packages can export multiple integrations, aka `policy_templates`
// In the case where packages ship >1 `policy_templates`, we flatten out the
// list of packages by bringing all integrations to top-level so that
// each integration is displayed as its own tile
const packageListToIntegrationsList = (packages: PackageList): PackageList => {
  return packages.reduce((acc: PackageList, pkg) => {
    const {
      policy_templates: policyTemplates = [],
      categories: topCategories = [],
      ...restOfPackage
    } = pkg;

    const topPackage = {
      ...restOfPackage,
      categories: getAllCategoriesFromIntegrations(pkg),
    };

    return [
      ...acc,
      topPackage,
      ...(doesPackageHaveIntegrations(pkg)
        ? policyTemplates.map((policyTemplate) => {
            const { name, title, description, icons } = policyTemplate;

            const categories =
              isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.categories
                ? policyTemplate.categories
                : [];
            const allCategories = [...topCategories, ...categories];
            return {
              ...restOfPackage,
              id: `${restOfPackage.id}-${name}`,
              integration: name,
              title,
              description,
              icons: icons || restOfPackage.icons,
              categories: uniq(allCategories),
            };
          })
        : []),
    ];
  }, []);
};

export const useAvailablePackages = () => {
  const [preference, setPreference] = useState<IntegrationPreferenceType>('recommended');
  const [prereleaseIntegrationsEnabled, setPrereleaseIntegrationsEnabled] = React.useState<
    boolean | undefined
  >(undefined);
  const { http } = useStartServices();
  const addBasePath = http.basePath.prepend;

  const {
    selectedCategory: initialSelectedCategory,
    selectedSubcategory: initialSubcategory,
    searchParam,
  } = getParams(useParams<CategoryParams>(), useLocation().search);

  const [selectedCategory, setCategory] = useState(initialSelectedCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>(
    initialSubcategory
  );
  const [searchTerm, setSearchTerm] = useState(searchParam || '');

  const { getHref, getAbsolutePath } = useLink();
  const history = useHistory();

  const buildUrl = ({ searchString, categoryId, subCategoryId }: IntegrationsURLParameters) => {
    const url = pagePathGetters.integrations_all({
      category: categoryId ? categoryId : '',
      subCategory: subCategoryId ? subCategoryId : '',
      searchTerm: searchString ? searchString : '',
    })[1];
    return url;
  };

  const setUrlandPushHistory = ({
    searchString,
    categoryId,
    subCategoryId,
  }: IntegrationsURLParameters) => {
    const url = buildUrl({
      categoryId,
      searchString,
      subCategoryId,
    });
    history.push(url);
  };

  const setUrlandReplaceHistory = ({
    searchString,
    categoryId,
    subCategoryId,
  }: IntegrationsURLParameters) => {
    const url = buildUrl({
      categoryId,
      searchString,
      subCategoryId,
    });
    // Use .replace so the browser's back button is not tied to single keystroke
    history.replace(url);
  };

  const {
    data: eprPackages,
    isLoading: isLoadingAllPackages,
    error: eprPackageLoadingError,
  } = usePackages(prereleaseIntegrationsEnabled);

  // Remove Kubernetes package granularity
  if (eprPackages?.items) {
    eprPackages.items.forEach(function (element) {
      if (element.id === 'kubernetes') {
        element.policy_templates = [];
      }
    });
  }

  const eprIntegrationList = useMemo(
    () => packageListToIntegrationsList(eprPackages?.items || []),
    [eprPackages]
  );
  const { value: replacementCustomIntegrations } = useGetReplacementCustomIntegrations();

  const { loading: isLoadingAppendCustomIntegrations, value: appendCustomIntegrations } =
    useGetAppendCustomIntegrations();

  const mergedEprPackages: Array<PackageListItem | CustomIntegration> =
    useMergeEprPackagesWithReplacements(
      preference === 'beats' ? [] : eprIntegrationList,
      preference === 'agent' ? [] : replacementCustomIntegrations || []
    );

  const cards: IntegrationCardItem[] = useMemo(() => {
    const eprAndCustomPackages = [...mergedEprPackages, ...(appendCustomIntegrations || [])];

    return eprAndCustomPackages
      .map((item) => {
        return mapToCard({ getAbsolutePath, getHref, item, addBasePath });
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [addBasePath, appendCustomIntegrations, getAbsolutePath, getHref, mergedEprPackages]);

  // Packages to show
  // Filters out based on selected category and subcategory (if any)
  const filteredCards = useMemo(
    () =>
      cards.filter((c) => {
        if (selectedCategory === '') {
          return true;
        }
        if (!selectedSubCategory) return c.categories.includes(selectedCategory);

        return c.categories.includes(selectedSubCategory);
      }),
    [cards, selectedCategory, selectedSubCategory]
  );

  const {
    data: eprCategories,
    isLoading: isLoadingCategories,
    error: eprCategoryLoadingError,
  } = useCategories(prereleaseIntegrationsEnabled);

  // Subcategories
  const subCategories = useMemo(() => {
    return eprCategories?.items.filter((item) => item.parent_id !== undefined);
  }, [eprCategories?.items]);

  const allCategories: CategoryFacet[] = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] = isLoadingCategories
      ? []
      : mergeCategoriesAndCount(
          eprCategories
            ? (eprCategories.items as Array<{ id: string; title: string; count: number }>)
            : [],
          cards
        );
    return [
      {
        ...ALL_CATEGORY,
        count: cards.length,
      },
      ...(eprAndCustomCategories ? eprAndCustomCategories : []),
    ];
  }, [cards, eprCategories, isLoadingCategories]);

  // Filter out subcategories
  const mainCategories = xorBy(allCategories, subCategories, 'id');

  const availableSubCategories = useMemo(() => {
    return subCategories?.filter((c) => c.parent_id === selectedCategory);
  }, [selectedCategory, subCategories]);

  return {
    initialSelectedCategory,
    selectedCategory,
    setCategory,
    allCategories,
    mainCategories,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
    searchTerm,
    setSearchTerm,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    preference,
    setPreference,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    filteredCards,
    setPrereleaseIntegrationsEnabled,
  };
};
