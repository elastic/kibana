/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDeepLink, AppNavLinkStatus, Capabilities } from '@kbn/core/public';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { get } from 'lodash';
import { SecurityPageName } from '../../../common/constants';
import { UrlStateType } from '../components/url_state/constants';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { appLinks } from './structure';
import { Feature, LinkItem, LinkProps, NavLinkItem } from './types';

const createDeepLink = (link: LinkItem, linkProps?: LinkProps): AppDeepLink => ({
  id: link.id,
  path: link.path,
  title: link.title,
  ...(link.links && link.links.length
    ? {
        deepLinks: reduceLinks<AppDeepLink>({
          links: link.links,
          linkProps,
          formatFunction: createDeepLink,
        }),
      }
    : {}),
  ...(link.icon != null ? { euiIconType: link.icon } : {}),
  ...(link.image != null ? { icon: link.image } : {}),
  ...(link.globalSearchKeywords != null ? { keywords: link.globalSearchKeywords } : {}),
  ...(link.globalNavEnabled != null
    ? { navLinkStatus: link.globalNavEnabled ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden }
    : {}),
  ...(link.globalNavOrder != null ? { order: link.globalNavOrder } : {}),
  ...(link.globalSearchEnabled != null ? { searchable: link.globalSearchEnabled } : {}),
});

const createNavLinkItem = (link: LinkItem, linkProps?: LinkProps): NavLinkItem => ({
  id: link.id,
  path: link.path,
  title: link.title,
  ...(link.description != null ? { description: link.description } : {}),
  ...(link.icon != null ? { icon: link.icon } : {}),
  ...(link.image != null ? { image: link.image } : {}),
  ...(link.links && link.links.length
    ? {
        links: reduceLinks<NavLinkItem>({
          links: link.links,
          linkProps,
          formatFunction: createNavLinkItem,
        }),
      }
    : {}),
  ...(link.skipUrlState != null ? { skipUrlState: link.skipUrlState } : {}),
});

const hasFeaturesCapability = (
  features: Feature[] | undefined,
  capabilities: Capabilities
): boolean => {
  if (!features) {
    return true;
  }
  return features.some((featureKey) => get(capabilities, featureKey, false));
};

export function reduceLinks<T>({
  links,
  linkProps,
  formatFunction,
}: {
  links: LinkItem[];
  linkProps?: LinkProps;
  formatFunction: (link: LinkItem, linkProps?: LinkProps) => T;
}): T[] {
  return links.reduce((deepLinks: T[], link: LinkItem) => {
    if (
      linkProps != null &&
      // exclude link when license is basic and link is premium
      ((linkProps.isBasic && link.isPremium) ||
        // exclude link when enableExperimental[hideWhenExperimentalKey] is enabled and link has hideWhenExperimentalKey
        (link.hideWhenExperimentalKey != null &&
          linkProps.enableExperimental[link.hideWhenExperimentalKey]) ||
        // exclude link when enableExperimental[experimentalKey] is disabled and link has experimentalKey
        (link.experimentalKey != null && !linkProps.enableExperimental[link.experimentalKey]) ||
        // exclude link when link is not part of enabled feature capabilities
        (linkProps.capabilities != null &&
          !hasFeaturesCapability(link.features, linkProps.capabilities)))
    ) {
      return deepLinks;
    }
    return [...deepLinks, formatFunction(link, linkProps)];
  }, []);
}

export const getInitialDeepLinks = (): AppDeepLink[] => {
  return appLinks.map((link) => createDeepLink(link));
};

export const getDeepLinks = (
  enableExperimental: ExperimentalFeatures,
  licenseType?: LicenseType,
  capabilities?: Capabilities
): AppDeepLink[] => {
  const isBasic = licenseType === 'basic';
  return reduceLinks<AppDeepLink>({
    links: appLinks,
    linkProps: { enableExperimental, isBasic, capabilities },
    formatFunction: createDeepLink,
  });
};

export const getNavLinkItems = (
  enableExperimental: ExperimentalFeatures,
  licenseType?: LicenseType,
  capabilities?: Capabilities
): NavLinkItem[] => {
  const isBasic = licenseType === 'basic';
  return reduceLinks<NavLinkItem>({
    links: appLinks,
    linkProps: { enableExperimental, isBasic, capabilities },
    formatFunction: createNavLinkItem,
  });
};

const flattenLinkItems = (
  id: SecurityPageName,
  linkItems: LinkItem[],
  parentLinkItem?: LinkItem
): Array<Omit<LinkItem, 'links'>> =>
  linkItems.reduce((linkItemFound: Array<Omit<LinkItem, 'links'>>, linkItem) => {
    let topLevelItems = [...linkItemFound];
    const parentLinkItems = [];
    if (id === linkItem.id) {
      // omit links from result
      const { links, ...rest } = linkItem;
      topLevelItems = [...topLevelItems, ...(parentLinkItem != null ? [parentLinkItem] : []), rest];
    }
    if (linkItem.links) {
      if (parentLinkItem != null) {
        parentLinkItems.push(parentLinkItem);
      }
      topLevelItems = [...topLevelItems, ...flattenLinkItems(id, linkItem.links, parentLinkItem)];
    }
    return topLevelItems;
  }, []);

export const getNavLinkHierarchy = (id: SecurityPageName): Array<Omit<NavLinkItem, 'links'>> => {
  const hierarchy = flattenLinkItems(id, appLinks);

  return hierarchy.map((linkItem) => createNavLinkItem(linkItem));
};

const urlKeys: Array<{ key: UrlStateType; pages: SecurityPageName[] }> = [
  {
    key: 'administration',
    pages: [
      SecurityPageName.administration,
      SecurityPageName.endpoints,
      SecurityPageName.policies,
      SecurityPageName.trustedApps,
      SecurityPageName.eventFilters,
      SecurityPageName.hostIsolationExceptions,
      SecurityPageName.blocklist,
    ],
  },
  {
    key: 'alerts',
    pages: [SecurityPageName.alerts],
  },
  {
    key: 'cases',
    pages: [SecurityPageName.case],
  },
  {
    key: 'detection_response',
    pages: [SecurityPageName.detectionAndResponse],
  },
  {
    key: 'exceptions',
    pages: [SecurityPageName.exceptions],
  },
  {
    key: 'get_started',
    pages: [SecurityPageName.landing],
  },
  {
    key: 'host',
    pages: [
      SecurityPageName.hosts,
      SecurityPageName.hostsAuthentications,
      SecurityPageName.uncommonProcesses,
      SecurityPageName.hostsAnomalies,
      SecurityPageName.hostsEvents,
      SecurityPageName.hostsExternalAlerts,
      SecurityPageName.hostsRisk,
      SecurityPageName.sessions,
    ],
  },
  {
    key: 'network',
    pages: [
      SecurityPageName.network,
      SecurityPageName.networkDns,
      SecurityPageName.networkHttp,
      SecurityPageName.networkTls,
      SecurityPageName.networkExternalAlerts,
      SecurityPageName.networkAnomalies,
    ],
  },
  {
    key: 'overview',
    pages: [SecurityPageName.overview],
  },
  {
    key: 'rules',
    pages: [SecurityPageName.rules],
  },
  {
    key: 'timeline',
    pages: [SecurityPageName.timelines],
  },
  {
    key: 'users',
    pages: [
      SecurityPageName.users,
      SecurityPageName.usersAuthentications,
      SecurityPageName.usersAnomalies,
      SecurityPageName.usersRisk,
      SecurityPageName.usersEvents,
      SecurityPageName.usersExternalAlerts,
    ],
  },
];
const findUrlKey = (id: SecurityPageName) => {
  const urlKeyObj = urlKeys.find((p) => p.pages.includes(id));
  return urlKeyObj ? urlKeyObj.key : undefined;
};

export const needsUrlState = (id: SecurityPageName): boolean => findUrlKey(id) != null;
