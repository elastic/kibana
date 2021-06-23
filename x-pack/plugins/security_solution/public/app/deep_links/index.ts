/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { LicenseType } from '../../../../licensing/common/types';
import { SecurityDeepLinkName, SecurityDeepLinks, SecurityPageName } from '../types';
import { App, AppDeepLink, AppNavLinkStatus } from '../../../../../../src/core/public';
import { ADMINISTRATION, OVERVIEW, HOSTS, NETWORK } from '../translations';
import {
  APP_ICON_SOLUTION,
  HOSTS_PATH,
  NETWORK_PATH,
  ENDPOINTS_PATH,
  OVERVIEW_PATH,
  TRUSTED_APPS_PATH,
  EVENT_FILTERS_PATH,
} from '../../../common/constants';

export const topDeepLinks: AppDeepLink[] = [
  {
    id: SecurityPageName.overview,
    title: OVERVIEW,
    path: OVERVIEW_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    order: 9000,
    euiIconType: APP_ICON_SOLUTION,
  },
  {
    id: SecurityPageName.hosts,
    title: HOSTS,
    path: HOSTS_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    order: 9002,
    euiIconType: APP_ICON_SOLUTION,
  },
  {
    id: SecurityPageName.network,
    title: NETWORK,
    path: NETWORK_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    order: 9002,
    euiIconType: APP_ICON_SOLUTION,
  },
  {
    id: SecurityPageName.administration,
    title: ADMINISTRATION,
    path: ENDPOINTS_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    order: 9002,
    euiIconType: APP_ICON_SOLUTION,
  },
];

const nestedDeepLinks: SecurityDeepLinks = {
  [SecurityPageName.overview]: {
    base: [],
  },
  detections: {
    base: [
      {
        id: 'siemDetectionRules',
        title: i18n.translate('xpack.securitySolution.search.detections.manage', {
          defaultMessage: 'Manage Rules',
        }),
        keywords: ['rules'],
        path: '/rules',
      },
    ],
  },
  hosts: {
    base: [
      {
        id: 'authentications',
        title: i18n.translate('xpack.securitySolution.search.hosts.authentications', {
          defaultMessage: 'Authentications',
        }),
        path: '/authentications',
      },
      {
        id: 'uncommonProcesses',
        title: i18n.translate('xpack.securitySolution.search.hosts.uncommonProcesses', {
          defaultMessage: 'Uncommon Processes',
        }),
        path: '/uncommonProcesses',
      },
      {
        id: 'events',
        title: i18n.translate('xpack.securitySolution.search.hosts.events', {
          defaultMessage: 'Events',
        }),
        path: '/events',
      },
      {
        id: 'externalAlerts',
        title: i18n.translate('xpack.securitySolution.search.hosts.externalAlerts', {
          defaultMessage: 'External Alerts',
        }),
        path: '/alerts',
      },
    ],
    premium: [
      {
        id: 'anomalies',
        title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
          defaultMessage: 'Anomalies',
        }),
        path: '/anomalies',
      },
    ],
  },
  network: {
    base: [
      {
        id: 'dns',
        title: i18n.translate('xpack.securitySolution.search.network.dns', {
          defaultMessage: 'DNS',
        }),
        path: '/dns',
      },
      {
        id: 'http',
        title: i18n.translate('xpack.securitySolution.search.network.http', {
          defaultMessage: 'HTTP',
        }),
        path: '/http',
      },
      {
        id: 'tls',
        title: i18n.translate('xpack.securitySolution.search.network.tls', {
          defaultMessage: 'TLS',
        }),
        path: '/tls',
      },
      {
        id: 'externalAlertsNetwork',
        title: i18n.translate('xpack.securitySolution.search.network.externalAlerts', {
          defaultMessage: 'External Alerts',
        }),
        path: '/external-alerts',
      },
    ],
    premium: [
      {
        id: 'anomalies',
        title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
          defaultMessage: 'Anomalies',
        }),
        path: '/anomalies',
      },
    ],
  },
  timelines: {
    base: [
      {
        id: 'timelineTemplates',
        title: i18n.translate('xpack.securitySolution.search.timeline.templates', {
          defaultMessage: 'Templates',
        }),
        path: '/template',
      },
    ],
  },
  case: {
    base: [
      {
        id: 'create',
        title: i18n.translate('xpack.securitySolution.search.cases.create', {
          defaultMessage: 'Create New Case',
        }),
        path: '/create',
      },
    ],
    premium: [
      {
        id: 'configure',
        title: i18n.translate('xpack.securitySolution.search.cases.configure', {
          defaultMessage: 'Configure Cases',
        }),
        path: '/configure',
      },
    ],
  },
  administration: {
    base: [
      {
        id: SecurityPageName.endpoints,
        title: i18n.translate('xpack.securitySolution.search.administration.endpoints', {
          defaultMessage: 'Endpoints',
        }),
        path: ENDPOINTS_PATH,
      },
      {
        id: SecurityPageName.trustedApps,
        title: i18n.translate('xpack.securitySolution.search.administration.trustedApps', {
          defaultMessage: 'Trusted Applications',
        }),
        path: TRUSTED_APPS_PATH,
      },
      {
        id: SecurityPageName.eventFilters,
        title: i18n.translate('xpack.securitySolution.search.administration.eventFilters', {
          defaultMessage: 'Event Filters',
        }),
        path: EVENT_FILTERS_PATH,
      },
    ],
  },
};

const deepLinkKeywords: { [key in SecurityDeepLinkName]: string[] } = {
  [SecurityPageName.overview]: [
    i18n.translate('xpack.securitySolution.search.overview', {
      defaultMessage: 'Overview',
    }),
  ],
  detections: [
    i18n.translate('xpack.securitySolution.search.detections', {
      defaultMessage: 'Detections',
    }),
  ],
  hosts: [
    i18n.translate('xpack.securitySolution.search.hosts', {
      defaultMessage: 'Hosts',
    }),
  ],
  network: [
    i18n.translate('xpack.securitySolution.search.network', {
      defaultMessage: 'Network',
    }),
  ],
  timelines: [
    i18n.translate('xpack.securitySolution.search.timelines', {
      defaultMessage: 'Timelines',
    }),
  ],
  case: [
    i18n.translate('xpack.securitySolution.search.cases', {
      defaultMessage: 'Cases',
    }),
  ],
  [SecurityPageName.administration]: [
    i18n.translate('xpack.securitySolution.search.administration', {
      defaultMessage: 'Administration',
    }),
  ],
};

/**
 * TODO: [1101] remove function
 * A function that generates a subPlugin's meta tag
 * @param subPluginName SubPluginName of the app to retrieve meta information for.
 * @param licenseType optional string for license level, if not provided basic is assumed.
 */
export function getDeepLinksAndKeywords(
  subPluginName: SecurityDeepLinkName,
  licenseType?: LicenseType
): Pick<App, 'deepLinks' | 'keywords'> {
  const baseRoutes = [...nestedDeepLinks[subPluginName].base];
  if (
    licenseType === 'gold' ||
    licenseType === 'platinum' ||
    licenseType === 'enterprise' ||
    licenseType === 'trial'
  ) {
    const premiumRoutes = nestedDeepLinks[subPluginName] && nestedDeepLinks[subPluginName].premium;
    if (premiumRoutes !== undefined) {
      return {
        keywords: deepLinkKeywords[subPluginName],
        deepLinks: [...baseRoutes, ...premiumRoutes],
      };
    }
  }
  return {
    keywords: deepLinkKeywords[subPluginName],
    deepLinks: baseRoutes,
  };
}

/**
 * A function that generates the plugin deepLinks
 * @param licenseType optional string for license level, if not provided basic is assumed.
 */
export function getDeepLinks(licenseType?: LicenseType): AppDeepLink[] {
  return topDeepLinks.map((deepLink) => {
    const deepLinkId = deepLink.id as SecurityDeepLinkName;
    const subPluginDeepLinks = nestedDeepLinks[deepLinkId];
    const baseDeepLinks = [...subPluginDeepLinks.base];
    if (isPremiumLicense(licenseType)) {
      const premiumDeepLinks = subPluginDeepLinks && subPluginDeepLinks.premium;
      if (premiumDeepLinks !== undefined) {
        return {
          ...deepLink,
          keywords: deepLinkKeywords[deepLinkId],
          deepLinks: [...baseDeepLinks, ...premiumDeepLinks],
        };
      }
    }
    return {
      ...deepLink,
      keywords: deepLinkKeywords[deepLinkId],
      deepLinks: baseDeepLinks,
    };
  });
}

export function isPremiumLicense(licenseType?: LicenseType): boolean {
  return (
    licenseType !== undefined &&
    (licenseType === 'gold' ||
      licenseType === 'platinum' ||
      licenseType === 'enterprise' ||
      licenseType === 'trial')
  );
}
