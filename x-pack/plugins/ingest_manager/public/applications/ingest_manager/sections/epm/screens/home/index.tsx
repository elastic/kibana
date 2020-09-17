/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useRouteMatch, Switch, Route, useLocation, useHistory } from 'react-router-dom';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { i18n } from '@kbn/i18n';
import { PAGE_ROUTING_PATHS } from '../../../../constants';
import { useLink, useGetCategories, useGetPackages, useBreadcrumbs } from '../../../../hooks';
import { WithHeaderLayout } from '../../../../layouts';
import { CategorySummaryItem } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';
import { CategoryFacets } from './category_facets';
import { HeroCopy, HeroImage } from './header';

export function EPMHomePage() {
  const {
    params: { tabId },
  } = useRouteMatch<{ tabId?: string }>();
  const { getHref } = useLink();

  return (
    <WithHeaderLayout
      leftColumn={<HeroCopy />}
      rightColumn={<HeroImage />}
      tabs={
        ([
          {
            id: 'all_packages',
            name: i18n.translate('xpack.ingestManager.epmList.allTabText', {
              defaultMessage: 'All integrations',
            }),
            href: getHref('integrations_all'),
            isSelected: tabId !== 'installed',
          },
          {
            id: 'installed_packages',
            name: i18n.translate('xpack.ingestManager.epmList.installedTabText', {
              defaultMessage: 'Installed integrations',
            }),
            href: getHref('integrations_installed'),
            isSelected: tabId === 'installed',
          },
        ] as unknown) as EuiTabProps[]
      }
    >
      <Switch>
        <Route path={PAGE_ROUTING_PATHS.integrations_installed}>
          <InstalledPackages />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.integrations_all}>
          <AvailablePackages />
        </Route>
      </Switch>
    </WithHeaderLayout>
  );
}

function InstalledPackages() {
  useBreadcrumbs('integrations_installed');
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackages({
    experimental: true,
  });
  const [selectedCategory, setSelectedCategory] = useState('');

  const title = i18n.translate('xpack.ingestManager.epmList.installedTitle', {
    defaultMessage: 'Installed integrations',
  });

  const allInstalledPackages =
    allPackages && allPackages.response
      ? allPackages.response.filter((pkg) => pkg.status === 'installed')
      : [];

  const updatablePackages = allInstalledPackages.filter(
    (item) => 'savedObject' in item && item.version > item.savedObject.attributes.version
  );

  const categories = [
    {
      id: '',
      title: i18n.translate('xpack.ingestManager.epmList.allFilterLinkText', {
        defaultMessage: 'All',
      }),
      count: allInstalledPackages.length,
    },
    {
      id: 'updates_available',
      title: i18n.translate('xpack.ingestManager.epmList.updatesAvailableFilterLinkText', {
        defaultMessage: 'Updates available',
      }),
      count: updatablePackages.length,
    },
  ];

  const controls = (
    <CategoryFacets
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategorySummaryItem) => setSelectedCategory(id)}
    />
  );

  return (
    <PackageListGrid
      isLoading={isLoadingPackages}
      controls={controls}
      title={title}
      list={selectedCategory === 'updates_available' ? updatablePackages : allInstalledPackages}
    />
  );
}

function AvailablePackages() {
  useBreadcrumbs('integrations_all');
  const history = useHistory();
  const queryParams = new URLSearchParams(useLocation().search);
  const initialCategory = queryParams.get('category') || '';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const { data: allPackagesRes, isLoading: isLoadingAllPackages } = useGetPackages();
  const { data: categoryPackagesRes, isLoading: isLoadingCategoryPackages } = useGetPackages({
    category: selectedCategory,
  });
  const { data: categoriesRes, isLoading: isLoadingCategories } = useGetCategories();
  const packages =
    categoryPackagesRes && categoryPackagesRes.response ? categoryPackagesRes.response : [];

  const title = i18n.translate('xpack.ingestManager.epmList.allTitle', {
    defaultMessage: 'Browse by category',
  });

  const categories = [
    {
      id: '',
      title: i18n.translate('xpack.ingestManager.epmList.allPackagesFilterLinkText', {
        defaultMessage: 'All',
      }),
      count: allPackagesRes?.response?.length || 0,
    },
    ...(categoriesRes ? categoriesRes.response : []),
  ];
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
    />
  );
}
