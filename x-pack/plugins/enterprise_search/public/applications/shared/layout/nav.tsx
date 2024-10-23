/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiIcon } from '@elastic/eui';
import type { ChromeNavLink, EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import { ANALYTICS_PLUGIN, APPLICATIONS_PLUGIN } from '../../../../common/constants';
import { SEARCH_APPLICATIONS_PATH, SearchApplicationViewTabs } from '../../applications/routes';
import { useIndicesNav } from '../../enterprise_search_content/components/search_index/indices/indices_nav';

import { KibanaLogic } from '../kibana';
import { LicensingLogic } from '../licensing';
import {
  ClassicNavItem,
  DeepLinkNavItem,
  GenerateNavLinkParameters,
  GenerateNavLinkFromDeepLinkParameters,
} from '../types';

import { buildBaseClassicNavItems } from './base_nav';
import { generateNavLink } from './nav_link_helpers';

/**
 * Hook to generate the Enterprise Search navigation items
 *
 * @param alwaysReturn Flag to always return the nav items, even if the sidebar is disabled
 * @returns The Enterprise Search navigation items
 */
export const useEnterpriseSearchNav = (alwaysReturn = false) => {
  const { isSidebarEnabled, productAccess, getNavLinks } = useValues(KibanaLogic);

  const { hasEnterpriseLicense } = useValues(LicensingLogic);

  const indicesNavItems = useIndicesNav();

  const deepLinks = useMemo(() => {
    return getNavLinks().reduce((links, link) => {
      links[link.id] = link;
      return links;
    }, {} as Record<string, ChromeNavLink | undefined>);
  }, []);
  const navItems: Array<EuiSideNavItemTypeEnhanced<unknown>> = useMemo(() => {
    const baseNavItems = buildBaseClassicNavItems({ hasEnterpriseLicense, productAccess });

    return generateSideNavItems(baseNavItems, deepLinks, { search_indices: indicesNavItems });
  }, [hasEnterpriseLicense, productAccess, indicesNavItems, deepLinks]);

  if (!isSidebarEnabled && !alwaysReturn) return undefined;

  return navItems;
};

export const useEnterpriseSearchApplicationNav = (
  searchApplicationName?: string,
  isEmptyState?: boolean,
  hasSchemaConflicts?: boolean,
  alwaysReturn?: boolean
) => {
  const navItems = useEnterpriseSearchNav(alwaysReturn);
  if (!navItems) return undefined;
  if (!searchApplicationName) return navItems;
  const applicationsItem = navItems.find((item) => item.id === 'build');
  if (!applicationsItem || !applicationsItem.items) return navItems;
  const searchApplicationsItem = applicationsItem.items?.find(
    (item) => item.id === 'searchApplications'
  );
  if (!searchApplicationsItem || searchApplicationsItem.id !== 'searchApplications')
    return navItems;

  const searchApplicationPath = `${APPLICATIONS_PLUGIN.URL}${SEARCH_APPLICATIONS_PATH}/${searchApplicationName}`;

  searchApplicationsItem.items = !isEmptyState
    ? [
        {
          id: 'searchApplicationId',
          name: searchApplicationName,
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: false,
            to: searchApplicationPath,
          }),
          items: [
            {
              id: 'enterpriseSearchApplicationDocsExplorer',
              name: i18n.translate(
                'xpack.enterpriseSearch.nav.searchApplication.docsExplorerTitle',
                {
                  defaultMessage: 'Docs Explorer',
                }
              ),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${searchApplicationPath}/${SearchApplicationViewTabs.DOCS_EXPLORER}`,
              }),
            },
            {
              // Required for the new side nav
              iconToString: hasSchemaConflicts ? 'warning' : undefined,
              id: 'enterpriseSearchApplicationsContent',
              name: (
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  {i18n.translate('xpack.enterpriseSearch.nav.searchApplication.contentTitle', {
                    defaultMessage: 'Content',
                  })}
                  {hasSchemaConflicts && <EuiIcon type="warning" color="danger" />}
                </EuiFlexGroup>
              ),
              // Required for the new side nav
              nameToString: i18n.translate(
                'xpack.enterpriseSearch.nav.searchApplication.contentTitle',
                {
                  defaultMessage: 'Content',
                }
              ),
              ...generateNavLink({
                shouldNotCreateHref: true,
                shouldShowActiveForSubroutes: true,
                to: `${searchApplicationPath}/${SearchApplicationViewTabs.CONTENT}`,
              }),
            },
            {
              id: 'enterpriseSearchApplicationConnect',
              name: i18n.translate(
                'xpack.enterpriseSearch.nav.applications.searchApplications.connectTitle',
                {
                  defaultMessage: 'Connect',
                }
              ),
              ...generateNavLink({
                shouldNotCreateHref: true,
                shouldShowActiveForSubroutes: true,
                to: `${searchApplicationPath}/${SearchApplicationViewTabs.CONNECT}`,
              }),
            },
          ],
        },
      ]
    : [
        {
          id: 'searchApplicationId',
          name: searchApplicationName,
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: searchApplicationPath,
          }),
        },
      ];

  return navItems;
};

export const useEnterpriseSearchAnalyticsNav = (
  name?: string,
  paths?: {
    explorer: string;
    integration: string;
    overview: string;
  },
  alwaysReturn?: boolean
) => {
  const navItems = useEnterpriseSearchNav(alwaysReturn);

  if (!navItems) return undefined;

  const applicationsNav = navItems.find((item) => item.id === 'build');
  const analyticsNav = applicationsNav?.items?.find((item) => item.id === 'analyticsCollections');

  if (!name || !paths || !analyticsNav) return navItems;

  analyticsNav.items = [
    {
      id: 'analyticsCollection',
      items: [
        {
          id: 'analyticsCollectionOverview',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.overviewTitle', {
            defaultMessage: 'Overview',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.overview,
          }),
        },
        {
          id: 'analyticsCollectionExplorer',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.explorerTitle', {
            defaultMessage: 'Explorer',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.explorer,
          }),
        },
        {
          id: 'analyticsCollectionIntegration',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.integrationTitle', {
            defaultMessage: 'Integration',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.integration,
          }),
        },
      ],
      name,
    },
  ];

  return navItems;
};

export const generateSideNavItems = (
  navItems: ClassicNavItem[],
  deepLinks: Record<string, ChromeNavLink | undefined>,
  subItemsMap: Record<string, Array<EuiSideNavItemTypeEnhanced<unknown>> | undefined> = {}
): Array<EuiSideNavItemTypeEnhanced<unknown>> => {
  const sideNavItems: Array<EuiSideNavItemTypeEnhanced<unknown>> = [];

  for (const navItem of navItems) {
    let sideNavChildItems: Array<EuiSideNavItemTypeEnhanced<unknown>> | undefined;

    const { items, ...rest } = navItem;
    const subItems = subItemsMap?.[navItem.id];

    if (items || subItems) {
      sideNavChildItems = [];
      if (items) {
        sideNavChildItems.push(...generateSideNavItems(items, deepLinks, subItemsMap));
      }
      if (subItems) {
        sideNavChildItems.push(...subItems);
      }
    }
    let sideNavItem: EuiSideNavItemTypeEnhanced<unknown> | undefined;
    if (isDeepLinkNavItem(navItem)) {
      const deepLink = navItem.deepLink;
      const navLinkParams = getNavLinkParameters(deepLink, deepLinks);
      if (navLinkParams !== undefined) {
        const name = getDeepLinkTitle(deepLink.link, deepLinks);
        sideNavItem = {
          name,
          ...rest,
          ...generateNavLink({
            ...navLinkParams,
            items: sideNavChildItems,
          }),
        };
      }
    } else {
      sideNavItem = {
        ...rest,
        items: sideNavChildItems,
        name: navItem.name,
      };
    }

    if (isValidSideNavItem(sideNavItem)) {
      sideNavItems.push(sideNavItem);
    }
  }

  return sideNavItems;
};

function isDeepLinkNavItem(item: ClassicNavItem): item is DeepLinkNavItem {
  return 'deepLink' in item;
}
const getNavLinkParameters = (
  navLink: GenerateNavLinkFromDeepLinkParameters,
  deepLinks: Record<string, ChromeNavLink | undefined>
): GenerateNavLinkParameters | undefined => {
  const { link, ...navLinkProps } = navLink;
  const deepLink = deepLinks[link];
  if (!deepLink || !deepLink.url) return undefined;
  return {
    ...navLinkProps,
    shouldNotCreateHref: true,
    shouldNotPrepend: true,
    to: deepLink.url,
  };
};
const getDeepLinkTitle = (
  link: string,
  deepLinks: Record<string, ChromeNavLink | undefined>
): string | undefined => {
  const deepLink = deepLinks[link];
  if (!deepLink || !deepLink.url) return undefined;
  return deepLink.title;
};

function isValidSideNavItem(
  item: EuiSideNavItemTypeEnhanced<unknown> | undefined
): item is EuiSideNavItemTypeEnhanced<unknown> {
  if (item === undefined) return false;
  if (item.href || item.onClick) return true;
  if (item?.items?.length ?? 0 > 0) return true;

  return false;
}
