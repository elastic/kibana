/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDeepLink, AppNavLinkStatus, Capabilities } from '@kbn/core/public';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { get } from 'lodash';
import { APP_PATH, SecurityPageName } from '../../../common/constants';
import { UrlStateType } from '../components/url_state/constants';
import { securityNavKeys } from '../components/navigation/types';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { ADMINISTRATION } from '../../app/translations';
import { appLinks } from './structure';
import { Feature, LinkItem, LinkProps, SiemNavTabs } from './types';

const createDeepLink = (link: LinkItem, linkProps?: LinkProps): AppDeepLink => ({
  ...(link.items && link.items.length ? { deepLinks: reduceDeepLinks(link.items, linkProps) } : {}),
  ...(link.icon != null ? { euiIconType: link.icon } : {}),
  ...(link.image != null ? { icon: link.image } : {}),
  id: link.id,
  ...(link.globalSearchKeywords != null ? { keywords: link.globalSearchKeywords } : {}),
  ...(link.globalNavEnabled != null
    ? { navLinkStatus: link.globalNavEnabled ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden }
    : {}),
  ...(link.globalNavOrder != null ? { order: link.globalNavOrder } : {}),
  path: link.url,
  ...(link.globalSearchEnabled != null ? { searchable: link.globalSearchEnabled } : {}),
  title: link.label,
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

const reduceDeepLinks = (links: LinkItem[], linkProps?: LinkProps): AppDeepLink[] =>
  links.reduce((deepLinks: AppDeepLink[], link: LinkItem) => {
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
    return [...deepLinks, createDeepLink(link, linkProps)];
  }, []);

export const getInitialDeepLinks = (): AppDeepLink[] => {
  return appLinks.map((link) => createDeepLink(link));
};

export const getDeepLinks = (
  enableExperimental: ExperimentalFeatures,
  licenseType?: LicenseType,
  capabilities?: Capabilities
): AppDeepLink[] => {
  const isBasic = licenseType === 'basic';
  return reduceDeepLinks(appLinks, { enableExperimental, isBasic, capabilities });
};

const flattenLinkItems = (
  ids: SecurityPageName[],
  linkItems: LinkItem[]
): Array<Omit<LinkItem, 'items'>> =>
  linkItems.reduce((linkItemFound: Array<Omit<LinkItem, 'items'>>, linkItem) => {
    let topLevelItems = [...linkItemFound];
    if (ids.includes(linkItem.id)) {
      // omit items from result
      const { items, ...rest } = linkItem;
      topLevelItems = [...topLevelItems, rest];
    }
    if (linkItem.items) {
      topLevelItems = [...topLevelItems, ...flattenLinkItems(ids, linkItem.items)];
    }
    return topLevelItems;
  }, []);

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

// const needsUrlState = ()

export const getNavTabs = (ids?: SecurityPageName[]): SiemNavTabs => {
  const linkItems = flattenLinkItems(ids == null ? Object.values(securityNavKeys) : ids, appLinks);
  const securityNav: SiemNavTabs = {};
  linkItems.forEach((link) => {
    securityNav[link.id] = {
      disabled: false,
      href: `${APP_PATH}${link.url}`,
      id: link.id,
      name: link.id === SecurityPageName.administration ? ADMINISTRATION : link.label,
      urlKey: findUrlKey(link.id),
      ...(link.isBeta != null ? { isBeta: link.isBeta } : {}),
    };
  });
  return securityNav;
};

export const needsUrlState = (id: SecurityPageName): boolean => findUrlKey(id) != null;
