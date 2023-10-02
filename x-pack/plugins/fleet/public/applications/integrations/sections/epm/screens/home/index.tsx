/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import type {
  CustomIntegration,
  CustomIntegrationIcon,
} from '@kbn/custom-integrations-plugin/common';

import { hasDeferredInstallations } from '../../../../../../services/has_deferred_installations';
import { getPackageReleaseLabel } from '../../../../../../../common/services';

import { installationStatuses } from '../../../../../../../common/constants';
import type {
  PackageSpecIcon,
  IntegrationCardReleaseLabel,
} from '../../../../../../../common/types';

import type { DynamicPage, DynamicPagePathValues, StaticPage } from '../../../../constants';
import { INTEGRATIONS_ROUTING_PATHS, INTEGRATIONS_SEARCH_QUERYPARAM } from '../../../../constants';
import { DefaultLayout } from '../../../../layouts';
import { isPackageUnverified, isPackageUpdatable } from '../../../../services';

import type { PackageListItem } from '../../../../types';

import { useGetPackagesQuery } from '../../../../hooks';

import type { CategoryFacet, ExtendedIntegrationCategory } from './category_facets';

import { InstalledPackages } from './installed_packages';
import { AvailablePackages } from './available_packages';

export interface CategoryParams {
  category?: ExtendedIntegrationCategory;
  subcategory?: string;
}

export interface IntegrationCardItem {
  url: string;
  release?: IntegrationCardReleaseLabel;
  description: string;
  name: string;
  title: string;
  version: string;
  icons: Array<PackageSpecIcon | CustomIntegrationIcon>;
  integration: string;
  id: string;
  categories: string[];
  fromIntegrations?: string;
  isReauthorizationRequired?: boolean;
  isUnverified?: boolean;
  isUpdateAvailable?: boolean;
  showLabels?: boolean;
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
  let isReauthorizationRequired = false;
  if (item.type === 'ui_link') {
    uiInternalPathUrl = item.id.includes('language_client.')
      ? addBasePath(item.uiInternalPath)
      : item.uiExternalLink || getAbsolutePath(item.uiInternalPath);
  } else {
    let urlVersion = item.version;
    if (item?.installationInfo?.version) {
      urlVersion = item.installationInfo.version || item.version;
      isUnverified = isPackageUnverified(item, packageVerificationKeyId);
      isUpdateAvailable = isPackageUpdatable(item);

      isReauthorizationRequired = hasDeferredInstallations(item);
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
    isReauthorizationRequired,
    isUnverified,
    isUpdateAvailable,
  };
};

export const EPMHomePage: React.FC = () => {
  const [prereleaseEnabled, setPrereleaseEnabled] = useState<boolean>(false);

  // loading packages to find installed ones
  const { data: allPackages, isLoading } = useGetPackagesQuery({
    prerelease: prereleaseEnabled,
  });

  const installedPackages = useMemo(
    () => (allPackages?.items || []).filter((pkg) => pkg.status === installationStatuses.Installed),
    [allPackages]
  );

  const unverifiedPackageCount = useMemo(
    () =>
      installedPackages.filter(
        (pkg) =>
          pkg.installationInfo?.verification_status &&
          pkg.installationInfo.verification_status === 'unverified'
      ).length,
    [installedPackages]
  );

  const upgradeablePackageCount = useMemo(
    () => installedPackages.filter(isPackageUpdatable).length,
    [installedPackages]
  );

  const notificationsBySection = {
    manage: unverifiedPackageCount + upgradeablePackageCount,
  };
  return (
    <Routes>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_installed}>
        <DefaultLayout section="manage" notificationsBySection={notificationsBySection}>
          <InstalledPackages installedPackages={installedPackages} isLoading={isLoading} />
        </DefaultLayout>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_all}>
        <DefaultLayout section="browse" notificationsBySection={notificationsBySection}>
          <AvailablePackages setPrereleaseEnabled={setPrereleaseEnabled} />
        </DefaultLayout>
      </Route>
    </Routes>
  );
};
