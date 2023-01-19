/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Switch, Route } from 'react-router-dom';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { getPackageReleaseLabel } from '../../../../../../../common/services';

import { installationStatuses } from '../../../../../../../common/constants';

import type { DynamicPage, DynamicPagePathValues, StaticPage } from '../../../../constants';
import { INTEGRATIONS_ROUTING_PATHS, INTEGRATIONS_SEARCH_QUERYPARAM } from '../../../../constants';
import { DefaultLayout } from '../../../../layouts';
import { isPackageUnverified } from '../../../../services';

import type { PackageListItem } from '../../../../types';

import type {
  IntegrationCardItem,
  IntegrationCardReleaseLabel,
} from '../../../../../../../common/types/models';

import { useGetPackages } from '../../../../hooks';

import type { Section } from '../../..';

import type { CategoryFacet, ExtendedIntegrationCategory } from './category_facets';

import { InstalledPackages } from './installed_packages';
import { AvailablePackages } from './available_packages';

export interface CategoryParams {
  category?: ExtendedIntegrationCategory;
}

export const getParams = (params: CategoryParams, search: string) => {
  const { category } = params;
  const selectedCategory: ExtendedIntegrationCategory = category || '';
  const queryParams = new URLSearchParams(search);
  const searchParam = queryParams.get(INTEGRATIONS_SEARCH_QUERYPARAM) || '';
  return { selectedCategory, searchParam };
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

  let version = 'version' in item ? item.version || '' : '';

  if (item.type === 'ui_link') {
    uiInternalPathUrl = item.id.includes('language_client.')
      ? addBasePath(item.uiInternalPath)
      : item.uiExternalLink || getAbsolutePath(item.uiInternalPath);
  } else {
    // installed package
    if (
      ['updates_available', 'installed'].includes(selectedCategory ?? '') &&
      'savedObject' in item
    ) {
      version = item.savedObject.attributes.version || item.version;
      isUnverified = isPackageUnverified(item, packageVerificationKeyId);
    }

    const url = getHref('integration_details_overview', {
      pkgkey: `${item.name}-${version}`,
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

  const atLeastOneUnverifiedPackageInstalled = installedPackages.some(
    (pkg) => 'savedObject' in pkg && pkg.savedObject.attributes.verification_status === 'unverified'
  );

  const sectionsWithWarning = (atLeastOneUnverifiedPackageInstalled ? ['manage'] : []) as Section[];
  return (
    <Switch>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_installed}>
        <DefaultLayout section="manage" sectionsWithWarning={sectionsWithWarning}>
          <InstalledPackages installedPackages={installedPackages} isLoading={isLoading} />
        </DefaultLayout>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_all}>
        <DefaultLayout section="browse" sectionsWithWarning={sectionsWithWarning}>
          <AvailablePackages />
        </DefaultLayout>
      </Route>
    </Switch>
  );
};
