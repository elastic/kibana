/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Switch, Route } from 'react-router-dom';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { getPackageReleaseLabel } from '../../../../../../services/package_prerelease';

import { installationStatuses } from '../../../../../../../common/constants';

import type { DynamicPage, DynamicPagePathValues, StaticPage } from '../../../../constants';
import { INTEGRATIONS_ROUTING_PATHS, INTEGRATIONS_SEARCH_QUERYPARAM } from '../../../../constants';
import { DefaultLayout } from '../../../../layouts';
import { isPackageUnverified, isPackageUpdatable } from '../../../../services';

import type { PackageListItem } from '../../../../types';

import type {
  IntegrationCardItem,
  IntegrationCardReleaseLabel,
} from '../../../../../../../common/types/models';

import { useGetPackages } from '../../../../hooks';

import type { CategoryFacet, ExtendedIntegrationCategory } from './category_facets';

import { InstalledPackages } from './installed_packages';
import { AvailablePackages } from './available_packages';

export interface CategoryParams {
  category?: ExtendedIntegrationCategory;
  subcategory?: string;
}

export const getParams = (params: CategoryParams, search: string) => {
  const { category, subcategory } = params;
  const selectedCategory: ExtendedIntegrationCategory = category || '';
  const queryParams = new URLSearchParams(search);
  const searchParam = queryParams.get(INTEGRATIONS_SEARCH_QUERYPARAM) || '';
  return { selectedCategory, searchParam, selectedSubcategory: subcategory };
};

export const categoryExists = (category: string, categories: CategoryFacet[]) => {
  return categories.some((c) => c.id === category);
};

export const mapToCard = ({
  getAbsolutePath,
  getHref,
  item,
  addBasePath,
  packageVerificationKeyId,
  selectedCategory,
}: {
  getAbsolutePath: (p: string) => string;
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
  addBasePath: (url: string) => string;
  item: CustomIntegration | PackageListItem;
  packageVerificationKeyId?: string;
  selectedCategory?: string;
}): IntegrationCardItem => {
  let uiInternalPathUrl: string;

  let isUnverified = false;

  const version = 'version' in item ? item.version || '' : '';

  let isUpdateAvailable = false;
  if (item.type === 'ui_link') {
    uiInternalPathUrl = item.id.includes('language_client.')
      ? addBasePath(item.uiInternalPath)
      : item.uiExternalLink || getAbsolutePath(item.uiInternalPath);
  } else {
    let urlVersion = item.version;
    if ('savedObject' in item) {
      urlVersion = item.savedObject.attributes.version || item.version;
      isUnverified = isPackageUnverified(item, packageVerificationKeyId);
      isUpdateAvailable = isPackageUpdatable(item);
    }

    const url = getHref('integration_details_overview', {
      pkgkey: `${item.name}-${urlVersion}`,
      ...(item.integration ? { integration: item.integration } : {}),
    });

    uiInternalPathUrl = url;
  }

  const release: IntegrationCardReleaseLabel = getPackageReleaseLabel(version);

  return {
    id: `${item.type === 'ui_link' ? 'ui_link' : 'epr'}:${item.id}`,
    description: item.description,
    icons: !item.icons || !item.icons.length ? [] : item.icons,
    title: item.title,
    url: uiInternalPathUrl,
    fromIntegrations: selectedCategory,
    integration: 'integration' in item ? item.integration || '' : '',
    name: 'name' in item ? item.name : item.id,
    version,
    release,
    categories: ((item.categories || []) as string[]).filter((c: string) => !!c),
    isUnverified,
    isUpdateAvailable,
  };
};

export const EPMHomePage: React.FC = () => {
  // loading packages to find installed ones
  const { data: allPackages, isLoading } = useGetPackages({
    prerelease: true,
  });

  const installedPackages = useMemo(
    () =>
      (allPackages?.response || []).filter((pkg) => pkg.status === installationStatuses.Installed),
    [allPackages?.response]
  );

  const unverifiedPackageCount = installedPackages.filter(
    (pkg) => 'savedObject' in pkg && pkg.savedObject.attributes.verification_status === 'unverified'
  ).length;

  const upgradeablePackageCount = installedPackages.filter(isPackageUpdatable).length;

  const notificationsBySection = {
    manage: unverifiedPackageCount + upgradeablePackageCount,
  };
  return (
    <Switch>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_installed}>
        <DefaultLayout section="manage" notificationsBySection={notificationsBySection}>
          <InstalledPackages installedPackages={installedPackages} isLoading={isLoading} />
        </DefaultLayout>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_all}>
        <DefaultLayout section="browse" notificationsBySection={notificationsBySection}>
          <AvailablePackages />
        </DefaultLayout>
      </Route>
    </Switch>
  );
};
