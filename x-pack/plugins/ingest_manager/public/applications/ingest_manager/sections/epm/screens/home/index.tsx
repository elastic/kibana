/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useRouteMatch, Switch, Route } from 'react-router-dom';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import { i18n } from '@kbn/i18n';
import {
  EPM_LIST_ALL_PACKAGES_PATH,
  EPM_LIST_INSTALLED_PACKAGES_PATH,
} from '../../../../constants';
import { useLink, useGetCategories, useGetPackages } from '../../../../hooks';
import { WithHeaderLayout } from '../../../../layouts';
import { CategorySummaryItem } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';
import { CategoryFacets } from './category_facets';
import { HeroCopy, HeroImage } from './header';

export function EPMHomePage() {
  const {
    params: { tabId },
  } = useRouteMatch<{ tabId?: string }>();

  const ALL_PACKAGES_URI = useLink(EPM_LIST_ALL_PACKAGES_PATH);
  const INSTALLED_PACKAGES_URI = useLink(EPM_LIST_INSTALLED_PACKAGES_PATH);

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
            href: ALL_PACKAGES_URI,
            isSelected: tabId !== 'installed',
          },
          {
            id: 'installed_packages',
            name: i18n.translate('xpack.ingestManager.epmList.installedTabText', {
              defaultMessage: 'Installed integrations',
            }),
            href: INSTALLED_PACKAGES_URI,
            isSelected: tabId === 'installed',
          },
        ] as unknown) as EuiTabProps[]
      }
    >
      <Switch>
        <Route path={EPM_LIST_INSTALLED_PACKAGES_PATH}>
          <InstalledPackages />
        </Route>
        <Route path={EPM_LIST_ALL_PACKAGES_PATH}>
          <AvailablePackages />
        </Route>
      </Switch>
    </WithHeaderLayout>
  );
}

function InstalledPackages() {
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackages();
  const [selectedCategory, setSelectedCategory] = useState('');

  const title = i18n.translate('xpack.ingestManager.epmList.installedTitle', {
    defaultMessage: 'Installed integrations',
  });

  const allInstalledPackages =
    allPackages && allPackages.response
      ? allPackages.response.filter(pkg => pkg.status === 'installed')
      : [];

  const updatablePackages = allInstalledPackages.filter(
    item => 'savedObject' in item && item.version > item.savedObject.attributes.version
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const { data: categoryPackagesRes, isLoading: isLoadingPackages } = useGetPackages({
    category: selectedCategory,
  });
  const { data: categoriesRes, isLoading: isLoadingCategories } = useGetCategories();
  const packages =
    categoryPackagesRes && categoryPackagesRes.response ? categoryPackagesRes.response : [];

  const title = i18n.translate('xpack.ingestManager.epmList.allTitle', {
    defaultMessage: 'All integrations',
  });

  const categories = [
    {
      id: '',
      title: i18n.translate('xpack.ingestManager.epmList.allPackagesFilterLinkText', {
        defaultMessage: 'All',
      }),
      count: packages.length,
    },
    ...(categoriesRes ? categoriesRes.response : []),
  ];
  const controls = categories ? (
    <CategoryFacets
      isLoading={isLoadingCategories}
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategorySummaryItem) => setSelectedCategory(id)}
    />
  ) : null;

  return (
    <PackageListGrid
      isLoading={isLoadingPackages}
      title={title}
      controls={controls}
      list={packages}
    />
  );
}
