/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Switch, Route } from 'react-router-dom';

import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import type { DynamicPage, DynamicPagePathValues, StaticPage } from '../../../../constants';
import { INTEGRATIONS_ROUTING_PATHS, INTEGRATIONS_SEARCH_QUERYPARAM } from '../../../../constants';
import { DefaultLayout } from '../../../../layouts';

import type { PackageListItem } from '../../../../types';

import type { IntegrationCardItem } from '../../../../../../../common/types/models';

import type { CategoryFacet } from './category_facets';
import { InstalledPackages } from './installed_packages';
import { AvailablePackages } from './available_packages';

export interface CategoryParams {
  category?: string;
}

export const getParams = (params: CategoryParams, search: string) => {
  const { category } = params;
  const selectedCategory = category || '';
  const queryParams = new URLSearchParams(search);
  const searchParam = queryParams.get(INTEGRATIONS_SEARCH_QUERYPARAM) || '';
  return { selectedCategory, searchParam } as {
    selectedCategory: IntegrationCategory & '';
    searchParam: string;
  };
};

export const categoryExists = (category: string, categories: CategoryFacet[]) => {
  return categories.some((c) => c.id === category);
};

export const mapToCard = (
  getAbsolutePath: (p: string) => string,
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string,
  item: CustomIntegration | PackageListItem
): IntegrationCardItem => {
  let uiInternalPathUrl;

  if (item.type === 'ui_link') {
    uiInternalPathUrl = getAbsolutePath(item.uiInternalPath);
  } else {
    let urlVersion = item.version;

    if ('savedObject' in item) {
      urlVersion = item.savedObject.attributes.version || item.version;
    }

    const url = getHref('integration_details_overview', {
      pkgkey: `${item.name}-${urlVersion}`,
      ...(item.integration ? { integration: item.integration } : {}),
    });

    uiInternalPathUrl = url;
  }

  let release: 'ga' | 'beta' | 'experimental' | undefined;
  if ('release' in item) {
    release = item.release;
  } else if (item.isBeta === true) {
    release = 'beta';
  }

  return {
    id: `${item.type === 'ui_link' ? 'ui_link' : 'epr'}:${item.id}`,
    description: item.description,
    icons: !item.icons || !item.icons.length ? [] : item.icons,
    title: item.title,
    url: uiInternalPathUrl,
    integration: 'integration' in item ? item.integration || '' : '',
    name: 'name' in item ? item.name || '' : '',
    version: 'version' in item ? item.version || '' : '',
    release,
    categories: ((item.categories || []) as string[]).filter((c: string) => !!c),
  };
};

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
