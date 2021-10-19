/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import _ from 'lodash';
import { EuiHorizontalRule, EuiFlexItem } from '@elastic/eui';

import { pagePathGetters } from '../../../../constants';
import {
  useGetCategories,
  useGetPackages,
  useBreadcrumbs,
  useGetAppendCustomIntegrations,
  useGetReplacementCustomIntegrations,
  useLink,
} from '../../../../hooks';
import { doesPackageHaveIntegrations } from '../../../../services';
import type { PackageList } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';

import type { CustomIntegration } from '../../../../../../../../../../src/plugins/custom_integrations/common';

import type { PackageListItem } from '../../../../types';

import type { IntegrationCardItem } from '../../../../../../../common/types/models';

import { useMergeEprPackagesWithReplacements } from '../../../../hooks/use_merge_epr_with_replacements';

import type { IntegrationPreferenceType } from '../../components/integration_preference';
import { IntegrationPreference } from '../../components/integration_preference';

import { mergeCategoriesAndCount } from './util';
import { ALL_CATEGORY, CategoryFacets } from './category_facets';
import type { CategoryFacet } from './category_facets';

import type { CategoryParams } from '.';
import { getParams, categoryExists, mapToCard } from '.';

function getAllCategoriesFromIntegrations(pkg: PackageListItem) {
  if (!doesPackageHaveIntegrations(pkg)) {
    return pkg.categories;
  }

  const allCategories = pkg.policy_templates?.reduce((accumulator, integration) => {
    return [...accumulator, ...(integration.categories || [])];
  }, pkg.categories || []);

  return _.uniq(allCategories);
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
        ? policyTemplates.map((integration) => {
            const { name, title, description, icons, categories = [] } = integration;
            const allCategories = [...topCategories, ...categories];
            return {
              ...restOfPackage,
              id: `${restOfPackage.id}-${name}`,
              integration: name,
              title,
              description,
              icons: icons || restOfPackage.icons,
              categories: _.uniq(allCategories),
            };
          })
        : []),
    ];
  }, []);
};

// TODO: clintandrewhall - this component is hard to test due to the hooks, particularly those that use `http`
// or `location` to load data.  Ideally, we'll split this into "connected" and "pure" components.
export const AvailablePackages: React.FC = memo(() => {
  const [preference, setPreference] = useState<IntegrationPreferenceType>('recommended');
  useBreadcrumbs('integrations_all');

  const { selectedCategory, searchParam } = getParams(
    useParams<CategoryParams>(),
    useLocation().search
  );

  const history = useHistory();
  const { getHref, getAbsolutePath } = useLink();

  function setSelectedCategory(categoryId: string) {
    const url = pagePathGetters.integrations_all({
      category: categoryId,
      searchTerm: searchParam,
    })[1];
    history.push(url);
  }

  function setSearchTerm(search: string) {
    // Use .replace so the browser's back button is not tied to single keystroke
    history.replace(pagePathGetters.integrations_all({ searchTerm: search })[1]);
  }

  const { data: eprPackages, isLoading: isLoadingAllPackages } = useGetPackages({
    category: '',
  });

  const eprIntegrationList = useMemo(
    () => packageListToIntegrationsList(eprPackages?.response || []),
    [eprPackages]
  );

  const { value: replacementCustomIntegrations } = useGetReplacementCustomIntegrations();

  const mergedEprPackages: Array<PackageListItem | CustomIntegration> =
    useMergeEprPackagesWithReplacements(
      preference === 'beats' ? [] : eprIntegrationList,
      preference === 'agent' ? [] : replacementCustomIntegrations || []
    );

  const { loading: isLoadingAppendCustomIntegrations, value: appendCustomIntegrations } =
    useGetAppendCustomIntegrations();

  const eprAndCustomPackages: Array<CustomIntegration | PackageListItem> = [
    ...mergedEprPackages,
    ...(appendCustomIntegrations || []),
  ];

  const cards: IntegrationCardItem[] = eprAndCustomPackages.map((item) => {
    return mapToCard(getAbsolutePath, getHref, item);
  });

  cards.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  const { data: eprCategories, isLoading: isLoadingCategories } = useGetCategories({
    include_policy_templates: true,
  });

  const categories = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] =
      isLoadingCategories || !eprCategories
        ? []
        : mergeCategoriesAndCount(
            eprCategories.response as Array<{ id: string; title: string; count: number }>,
            cards
          );
    return [
      {
        ...ALL_CATEGORY,
        count: cards.length,
      },
      ...(eprAndCustomCategories ? eprAndCustomCategories : []),
    ] as CategoryFacet[];
  }, [cards, eprCategories, isLoadingCategories]);

  if (!isLoadingCategories && !categoryExists(selectedCategory, categories)) {
    history.replace(pagePathGetters.integrations_all({ category: '', searchTerm: searchParam })[1]);
    return null;
  }

  let controls = [
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="m" />
      <IntegrationPreference initialType={preference} onChange={setPreference} />
    </EuiFlexItem>,
  ];

  if (categories) {
    controls = [
      <EuiFlexItem className="eui-yScrollWithShadows">
        <CategoryFacets
          isLoading={
            isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations
          }
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={({ id }) => {
            setSelectedCategory(id);
          }}
        />
      </EuiFlexItem>,
      ...controls,
    ];
  }

  const filteredCards = cards.filter((c) => {
    if (selectedCategory === '') {
      return true;
    }
    return c.categories.includes(selectedCategory);
  });

  return (
    <PackageListGrid
      isLoading={isLoadingAllPackages}
      controls={controls}
      initialSearch={searchParam}
      list={filteredCards}
      setSelectedCategory={setSelectedCategory}
      onSearchChange={setSearchTerm}
      showMissingIntegrationMessage
    />
  );
});
