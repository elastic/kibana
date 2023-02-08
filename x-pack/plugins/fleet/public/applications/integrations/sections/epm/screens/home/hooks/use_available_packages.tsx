/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';

import { uniq, xorBy } from 'lodash';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import type { IntegrationPreferenceType } from '../../../components/integration_preference';
import { useGetPackagesQuery, useGetCategoriesQuery } from '../../../../../hooks';
import {
  useGetAppendCustomIntegrations,
  useGetReplacementCustomIntegrations,
} from '../../../../../hooks';
import { useMergeEprPackagesWithReplacements } from '../../../../../hooks/use_merge_epr_with_replacements';

import { mapToCard } from '..';
import type { PackageList, PackageListItem } from '../../../../../types';

import { doesPackageHaveIntegrations } from '../../../../../services';

import {
  isInputOnlyPolicyTemplate,
  isIntegrationPolicyTemplate,
} from '../../../../../../../../common/services';

import type { IntegrationCardItem } from '../../../../../../../../common/types/models';

import { ALL_CATEGORY } from '../category_facets';
import type { CategoryFacet } from '../category_facets';

import { mergeCategoriesAndCount } from '../util';

import { useBuildIntegrationsUrl } from './use_build_integrations_url';

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

  const {
    initialSelectedCategory,
    initialSubcategory,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    getHref,
    getAbsolutePath,
    searchParam,
    addBasePath,
  } = useBuildIntegrationsUrl();

  const [selectedCategory, setCategory] = useState(initialSelectedCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>(
    initialSubcategory
  );
  const [searchTerm, setSearchTerm] = useState(searchParam || '');

  const {
    data: eprPackages,
    isLoading: isLoadingAllPackages,
    error: eprPackageLoadingError,
  } = useGetPackagesQuery({ prerelease: prereleaseIntegrationsEnabled });

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
    data: eprCategoriesRes,
    isLoading: isLoadingCategories,
    error: eprCategoryLoadingError,
  } = useGetCategoriesQuery({ prerelease: prereleaseIntegrationsEnabled });

  const eprCategories = useMemo(() => eprCategoriesRes?.items || [], [eprCategoriesRes]);
  // Subcategories
  const subCategories = useMemo(() => {
    return eprCategories?.filter((item) => item.parent_id !== undefined);
  }, [eprCategories]);

  const allCategories: CategoryFacet[] = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] = isLoadingCategories
      ? []
      : mergeCategoriesAndCount(
          eprCategories
            ? (eprCategories as Array<{ id: string; title: string; count: number }>)
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
