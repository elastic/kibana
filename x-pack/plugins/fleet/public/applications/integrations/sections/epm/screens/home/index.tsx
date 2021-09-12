/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Switch, Route, useLocation, useHistory, useParams } from 'react-router-dom';
import semverLt from 'semver/functions/lt';
import { i18n } from '@kbn/i18n';

import { installationStatuses } from '../../../../../../../common/constants';
import {
  INTEGRATIONS_ROUTING_PATHS,
  INTEGRATIONS_SEARCH_QUERYPARAM,
  pagePathGetters,
} from '../../../../constants';
import { useGetCategories, useGetPackages, useBreadcrumbs } from '../../../../hooks';
import { doesPackageHaveIntegrations } from '../../../../services';
import { DefaultLayout } from '../../../../layouts';
import type { CategorySummaryItem, PackageList } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';

import { CategoryFacets } from './category_facets';

export interface CategoryParams {
  category?: string;
}

function getParams(params: CategoryParams, search: string) {
  const { category } = params;
  const selectedCategory = category || '';
  const queryParams = new URLSearchParams(search);
  const searchParam = queryParams.get(INTEGRATIONS_SEARCH_QUERYPARAM) || '';
  return { selectedCategory, searchParam };
}

function categoryExists(category: string, categories: Array<{ id: string }>) {
  return categories.some((c) => c.id === category);
}

export const EPMHomePage: React.FC = memo(() => {
  return (
    <Switch>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_installed}>
        <DefaultLayout section="manage">
          <InstalledPackages />
        </DefaultLayout>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_all}>
        <DefaultLayout section="browse">
          <AvailablePackages />
        </DefaultLayout>
      </Route>
    </Switch>
  );
});

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

const InstalledPackages: React.FC = memo(() => {
  useBreadcrumbs('integrations_installed');
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackages({
    experimental: true,
  });

  const { selectedCategory, searchParam } = getParams(
    useParams<CategoryParams>(),
    useLocation().search
  );
  const history = useHistory();
  function setSelectedCategory(categoryId: string) {
    const url = pagePathGetters.integrations_installed({
      category: categoryId,
      query: searchParam,
    })[1];
    history.push(url);
  }
  function setSearchTerm(search: string) {
    history.replace(
      pagePathGetters.integrations_installed({
        category: selectedCategory,
        query: search,
      })[1]
    );
  }

  const allInstalledPackages = useMemo(
    () =>
      (allPackages?.response || []).filter((pkg) => pkg.status === installationStatuses.Installed),
    [allPackages?.response]
  );

  const updatablePackages = useMemo(
    () =>
      allInstalledPackages.filter(
        (item) =>
          'savedObject' in item && semverLt(item.savedObject.attributes.version, item.version)
      ),
    [allInstalledPackages]
  );

  const title = useMemo(
    () =>
      i18n.translate('xpack.fleet.epmList.installedTitle', {
        defaultMessage: 'Installed integrations',
      }),
    []
  );

  const categories = useMemo(
    () => [
      {
        id: '',
        title: i18n.translate('xpack.fleet.epmList.allFilterLinkText', {
          defaultMessage: 'All',
        }),
        count: allInstalledPackages.length,
      },
      {
        id: 'updates_available',
        title: i18n.translate('xpack.fleet.epmList.updatesAvailableFilterLinkText', {
          defaultMessage: 'Updates available',
        }),
        count: updatablePackages.length,
      },
    ],
    [allInstalledPackages.length, updatablePackages.length]
  );

  const controls = (
    <CategoryFacets
      categories={categories}
      selectedCategory={categoryExists(selectedCategory, categories) ? selectedCategory : ''}
      onCategoryChange={({ id }: CategorySummaryItem) => setSelectedCategory(id)}
    />
  );

  return (
    <PackageListGrid
      isLoading={isLoadingPackages}
      controls={controls}
      setSelectedCategory={setSelectedCategory}
      onSearchChange={setSearchTerm}
      initialSearch={searchParam}
      title={title}
      list={selectedCategory === 'updates_available' ? updatablePackages : allInstalledPackages}
    />
  );
});

const AvailablePackages: React.FC = memo(() => {
  useBreadcrumbs('integrations_all');
  const { selectedCategory, searchParam } = getParams(
    useParams<CategoryParams>(),
    useLocation().search
  );
  const history = useHistory();
  function setSelectedCategory(categoryId: string) {
    const url = pagePathGetters.integrations_all({ category: categoryId, query: searchParam })[1];
    history.push(url);
  }
  function setSearchTerm(search: string) {
    history.replace(
      pagePathGetters.integrations_all({ category: selectedCategory, query: search })[1]
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
  const packages = useMemo(
    () => packageListToIntegrationsList(categoryPackagesRes?.response || []),
    [categoryPackagesRes]
  );

  const allPackages = useMemo(
    () => packageListToIntegrationsList(allCategoryPackagesRes?.response || []),
    [allCategoryPackagesRes]
  );

  const title = useMemo(
    () =>
      i18n.translate('xpack.fleet.epmList.allTitle', {
        defaultMessage: 'Browse by category',
      }),
    []
  );

  const categories = useMemo(
    () => [
      {
        id: '',
        title: i18n.translate('xpack.fleet.epmList.allPackagesFilterLinkText', {
          defaultMessage: 'All',
        }),
        count: allPackages?.length || 0,
      },
      ...(categoriesRes ? categoriesRes.response : []),
    ],
    [allPackages?.length, categoriesRes]
  );

  const controls = categories ? (
    <CategoryFacets
      isLoading={isLoadingCategories || isLoadingAllPackages}
      categories={categories}
      selectedCategory={categoryExists(selectedCategory, categories) ? selectedCategory : ''}
      onCategoryChange={({ id }: CategorySummaryItem) => {
        setSelectedCategory(id);
      }}
    />
  ) : null;

  return (
    <PackageListGrid
      isLoading={isLoadingCategoryPackages}
      title={title}
      controls={controls}
      initialSearch={searchParam}
      list={packages}
      setSelectedCategory={setSelectedCategory}
      onSearchChange={setSearchTerm}
      showMissingIntegrationMessage
    />
  );
});
