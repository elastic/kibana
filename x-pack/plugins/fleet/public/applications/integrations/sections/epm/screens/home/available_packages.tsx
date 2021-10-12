/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule } from '@elastic/eui';

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
import type { PackageList, PackageListItem } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';

import type { CustomIntegration } from '../../../../../../../../../../src/plugins/custom_integrations/common';

import { useMergeEprPackagesWithReplacements } from '../../../../../../hooks/use_merge_epr_with_replacements';

import type { IntegrationPreferenceType } from '../../components/integration_preference';
import { IntegrationPreference } from '../../components/integration_preference';

import { mergeAndReplaceCategoryCounts } from './util';
import type { CategoryFacet } from './category_facets';
import { CategoryFacets } from './category_facets';

import type { CategoryParams } from '.';
import { getParams, categoryExists, mapToCard } from '.';

// Packages can export multiple integrations, aka `policy_templates`
// In the case where packages ship >1 `policy_templates`, we flatten out the
// list of packages by bringing all integrations to top-level so that
// each integration is displayed as its own tile
const packageListToIntegrationsList = (packages: PackageList): PackageList => {
  return packages.reduce((acc: PackageList, pkg) => {
    const { policy_templates: policyTemplates = [], ...restOfPackage } = pkg;
    return [
      ...acc,
      restOfPackage,
      ...(doesPackageHaveIntegrations(pkg)
        ? policyTemplates.map((integration) => {
            const { name, title, description, icons } = integration;
            return {
              ...restOfPackage,
              id: `${restOfPackage}-${name}`,
              integration: name,
              title,
              description,
              icons: icons || restOfPackage.icons,
            };
          })
        : []),
    ];
  }, []);
};

const title = i18n.translate('xpack.fleet.epmList.allTitle', {
  defaultMessage: 'Browse by category',
});

// TODO: clintandrewhall - this component is hard to test due to the hooks, particularly those that use `http`
// or `location` to load data.  Ideally, we'll split this into "connected" and "pure" components.
export const AvailablePackages: React.FC = memo(() => {
  const [preference, setPreference] = useState<IntegrationPreferenceType>('agent');
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
    history.replace(
      pagePathGetters.integrations_all({ category: selectedCategory, searchTerm: search })[1]
    );
  }

  const { data: allCategoryPackagesRes, isLoading: isLoadingAllPackages } = useGetPackages({
    category: '',
  });

  const { data: categoryPackagesRes, isLoading: isLoadingCategoryPackages } = useGetPackages({
    category: selectedCategory,
  });

  const { data: categoriesRes, isLoading: isLoadingCategories } = useGetCategories({
    include_policy_templates: true,
  });

  const eprPackages = useMemo(
    () => packageListToIntegrationsList(categoryPackagesRes?.response || []),
    [categoryPackagesRes]
  );

  const allEprPackages = useMemo(
    () => packageListToIntegrationsList(allCategoryPackagesRes?.response || []),
    [allCategoryPackagesRes]
  );

  const { value: replacementCustomIntegrations } = useGetReplacementCustomIntegrations();

  const mergedEprPackages: Array<PackageListItem | CustomIntegration> =
    useMergeEprPackagesWithReplacements(
      eprPackages || [],
      replacementCustomIntegrations || [],
      selectedCategory
    );

  const { loading: isLoadingAppendCustomIntegrations, value: appendCustomIntegrations } =
    useGetAppendCustomIntegrations();

  const filteredAddableIntegrations = appendCustomIntegrations
    ? appendCustomIntegrations.filter((integration: CustomIntegration) => {
        if (!selectedCategory) {
          return true;
        }
        return integration.categories.indexOf(selectedCategory) >= 0;
      })
    : [];

  const eprAndCustomPackages: Array<CustomIntegration | PackageListItem> = [
    ...mergedEprPackages,
    ...filteredAddableIntegrations,
  ];

  eprAndCustomPackages.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  const categories = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] =
      isLoadingCategories ||
      isLoadingAppendCustomIntegrations ||
      !appendCustomIntegrations ||
      !categoriesRes
        ? []
        : mergeAndReplaceCategoryCounts(
            categoriesRes.response as CategoryFacet[],
            appendCustomIntegrations
          );

    return [
      {
        id: '',
        count: (allEprPackages?.length || 0) + (appendCustomIntegrations?.length || 0),
      },
      ...(eprAndCustomCategories ? eprAndCustomCategories : []),
    ] as CategoryFacet[];
  }, [
    allEprPackages?.length,
    appendCustomIntegrations,
    categoriesRes,
    isLoadingAppendCustomIntegrations,
    isLoadingCategories,
  ]);

  if (!isLoadingCategories && !categoryExists(selectedCategory, categories)) {
    history.replace(pagePathGetters.integrations_all({ category: '', searchTerm: searchParam })[1]);
    return null;
  }

  // TODO: clintandrewhall - figure out the right logic for the onChange.
  let controls = [
    <EuiHorizontalRule />,
    <IntegrationPreference initialType={preference} onChange={setPreference} />,
  ];

  if (categories) {
    controls = [
      <CategoryFacets
        showCounts={false}
        isLoading={isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={({ id }) => {
          setSelectedCategory(id);
        }}
      />,
      ...controls,
    ];
  }

  const cards = eprAndCustomPackages.map((item) => {
    return mapToCard(getAbsolutePath, getHref, item);
  });

  return (
    <PackageListGrid
      isLoading={isLoadingCategoryPackages}
      title={title}
      controls={controls}
      initialSearch={searchParam}
      list={cards}
      setSelectedCategory={setSelectedCategory}
      onSearchChange={setSearchTerm}
      showMissingIntegrationMessage
    />
  );
});
