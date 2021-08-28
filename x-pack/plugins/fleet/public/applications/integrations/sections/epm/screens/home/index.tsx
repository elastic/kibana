/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { memo, useMemo, useState } from 'react';
import { Route, Switch, useHistory, useLocation } from 'react-router-dom';
import semverLt from 'semver/functions/lt';

import { installationStatuses } from '../../../../../../../common/constants/epm';
import { doesPackageHaveIntegrations } from '../../../../../../../common/services/packages_with_integrations';
import type {
  CategorySummaryItem,
  PackageList,
} from '../../../../../../../common/types/models/epm';
import { INTEGRATIONS_ROUTING_PATHS } from '../../../../../../constants/page_paths';
import { useGetCategories, useGetPackages } from '../../../../../../hooks/use_request/epm';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { DefaultLayout } from '../../../../layouts/default';
import { PackageListGrid } from '../../components/package_list_grid';

import { CategoryFacets } from './category_facets';

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
  const [selectedCategory, setSelectedCategory] = useState('');

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

  const controls = useMemo(
    () => (
      <CategoryFacets
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={({ id }: CategorySummaryItem) => setSelectedCategory(id)}
      />
    ),
    [categories, selectedCategory]
  );

  return (
    <PackageListGrid
      isLoading={isLoadingPackages}
      controls={controls}
      title={title}
      list={selectedCategory === 'updates_available' ? updatablePackages : allInstalledPackages}
    />
  );
});

const AvailablePackages: React.FC = memo(() => {
  useBreadcrumbs('integrations_all');
  const history = useHistory();
  const queryParams = new URLSearchParams(useLocation().search);
  const initialCategory = queryParams.get('category') || '';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
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
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategorySummaryItem) => {
        // clear category query param in the url
        if (queryParams.get('category')) {
          history.push({});
        }
        setSelectedCategory(id);
      }}
    />
  ) : null;

  return (
    <PackageListGrid
      isLoading={isLoadingCategoryPackages}
      title={title}
      controls={controls}
      list={packages}
      setSelectedCategory={setSelectedCategory}
      showMissingIntegrationMessage
    />
  );
});
