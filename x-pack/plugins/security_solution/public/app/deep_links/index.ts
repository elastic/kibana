/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';

import { LicenseType } from '../../../../licensing/common/types';
import { SecurityDeepLinkName, SecurityDeepLinks, SecurityPageName } from '../types';
import {
  AppDeepLink,
  ApplicationStart,
  AppNavLinkStatus,
  AppUpdater,
} from '../../../../../../src/core/public';
import {
  OVERVIEW,
  DETECT,
  ALERTS,
  RULES,
  EXCEPTIONS,
  HOSTS,
  NETWORK,
  TIMELINES,
  CASE,
  MANAGE,
} from '../translations';
import {
  OVERVIEW_PATH,
  ALERTS_PATH,
  RULES_PATH,
  EXCEPTIONS_PATH,
  HOSTS_PATH,
  NETWORK_PATH,
  TIMELINES_PATH,
  CASES_PATH,
  ENDPOINTS_PATH,
  TRUSTED_APPS_PATH,
  EVENT_FILTERS_PATH,
} from '../../../common/constants';

export const topDeepLinks: AppDeepLink[] = [
  {
    id: SecurityPageName.overview,
    title: OVERVIEW,
    path: OVERVIEW_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    keywords: [
      i18n.translate('xpack.securitySolution.search.overview', {
        defaultMessage: 'Overview',
      }),
    ],
    order: 9000,
  },
  {
    id: SecurityPageName.detections,
    title: DETECT,
    path: ALERTS_PATH,
    navLinkStatus: AppNavLinkStatus.hidden,
    keywords: [
      i18n.translate('xpack.securitySolution.search.detect', {
        defaultMessage: 'Detect',
      }),
    ],
  },
  {
    id: SecurityPageName.hosts,
    title: HOSTS,
    path: HOSTS_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    keywords: [
      i18n.translate('xpack.securitySolution.search.hosts', {
        defaultMessage: 'Hosts',
      }),
    ],
    order: 9002,
  },
  {
    id: SecurityPageName.network,
    title: NETWORK,
    path: NETWORK_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    keywords: [
      i18n.translate('xpack.securitySolution.search.network', {
        defaultMessage: 'Network',
      }),
    ],
    order: 9003,
  },
  {
    id: SecurityPageName.timelines,
    title: TIMELINES,
    path: TIMELINES_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    keywords: [
      i18n.translate('xpack.securitySolution.search.timelines', {
        defaultMessage: 'Timelines',
      }),
    ],
    order: 9004,
  },
  {
    id: SecurityPageName.case,
    title: CASE,
    path: CASES_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    keywords: [
      i18n.translate('xpack.securitySolution.search.cases', {
        defaultMessage: 'Cases',
      }),
    ],
    order: 9005,
  },
  {
    id: SecurityPageName.administration,
    title: MANAGE,
    path: ENDPOINTS_PATH,
    navLinkStatus: AppNavLinkStatus.hidden,
    keywords: [
      i18n.translate('xpack.securitySolution.search.manage', {
        defaultMessage: 'Manage',
      }),
    ],
  },
];

const nestedDeepLinks: SecurityDeepLinks = {
  [SecurityPageName.overview]: {
    base: [],
  },
  [SecurityPageName.detections]: {
    base: [
      {
        id: SecurityPageName.alerts,
        title: ALERTS,
        path: ALERTS_PATH,
        navLinkStatus: AppNavLinkStatus.visible,
        keywords: [
          i18n.translate('xpack.securitySolution.search.alerts', {
            defaultMessage: 'Alerts',
          }),
        ],
        searchable: true,
        order: 9001,
      },
      {
        id: SecurityPageName.rules,
        title: RULES,
        path: RULES_PATH,
        navLinkStatus: AppNavLinkStatus.hidden,
        keywords: [
          i18n.translate('xpack.securitySolution.search.rules', {
            defaultMessage: 'Rules',
          }),
        ],
        searchable: true,
      },
      {
        id: SecurityPageName.exceptions,
        title: EXCEPTIONS,
        path: EXCEPTIONS_PATH,
        navLinkStatus: AppNavLinkStatus.hidden,
        keywords: [
          i18n.translate('xpack.securitySolution.search.exceptions', {
            defaultMessage: 'Exceptions',
          }),
        ],
        searchable: true,
      },
    ],
  },
  [SecurityPageName.hosts]: {
    base: [
      {
        id: 'authentications',
        title: i18n.translate('xpack.securitySolution.search.hosts.authentications', {
          defaultMessage: 'Authentications',
        }),
        path: `${HOSTS_PATH}/authentications`,
      },
      {
        id: 'uncommonProcesses',
        title: i18n.translate('xpack.securitySolution.search.hosts.uncommonProcesses', {
          defaultMessage: 'Uncommon Processes',
        }),
        path: `${HOSTS_PATH}/uncommonProcesses`,
      },
      {
        id: 'events',
        title: i18n.translate('xpack.securitySolution.search.hosts.events', {
          defaultMessage: 'Events',
        }),
        path: `${HOSTS_PATH}/events`,
      },
      {
        id: 'externalAlerts',
        title: i18n.translate('xpack.securitySolution.search.hosts.externalAlerts', {
          defaultMessage: 'External Alerts',
        }),
        path: `${HOSTS_PATH}/alerts`,
      },
    ],
    premium: [
      {
        id: 'anomalies',
        title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
          defaultMessage: 'Anomalies',
        }),
        path: `${HOSTS_PATH}/anomalies`,
      },
    ],
  },
  [SecurityPageName.network]: {
    base: [
      {
        id: 'dns',
        title: i18n.translate('xpack.securitySolution.search.network.dns', {
          defaultMessage: 'DNS',
        }),
        path: `${NETWORK_PATH}/dns`,
      },
      {
        id: 'http',
        title: i18n.translate('xpack.securitySolution.search.network.http', {
          defaultMessage: 'HTTP',
        }),
        path: `${NETWORK_PATH}/http`,
      },
      {
        id: 'tls',
        title: i18n.translate('xpack.securitySolution.search.network.tls', {
          defaultMessage: 'TLS',
        }),
        path: `${NETWORK_PATH}/tls`,
      },
      {
        id: 'externalAlertsNetwork',
        title: i18n.translate('xpack.securitySolution.search.network.externalAlerts', {
          defaultMessage: 'External Alerts',
        }),
        path: `${NETWORK_PATH}/external-alerts`,
      },
    ],
    premium: [
      {
        id: 'anomalies',
        title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
          defaultMessage: 'Anomalies',
        }),
        path: `${NETWORK_PATH}/anomalies`,
      },
    ],
  },
  [SecurityPageName.timelines]: {
    base: [
      {
        id: 'timelineTemplates',
        title: i18n.translate('xpack.securitySolution.search.timeline.templates', {
          defaultMessage: 'Templates',
        }),
        path: `${TIMELINES_PATH}/template`,
      },
    ],
  },
  [SecurityPageName.case]: {
    base: [
      {
        id: 'create',
        title: i18n.translate('xpack.securitySolution.search.cases.create', {
          defaultMessage: 'Create New Case',
        }),
        path: `${CASES_PATH}/create`,
      },
    ],
    premium: [
      {
        id: 'configure',
        title: i18n.translate('xpack.securitySolution.search.cases.configure', {
          defaultMessage: 'Configure Cases',
        }),
        path: `${CASES_PATH}/configure`,
      },
    ],
  },
  [SecurityPageName.administration]: {
    base: [
      {
        id: SecurityPageName.endpoints,
        navLinkStatus: AppNavLinkStatus.visible,
        title: i18n.translate('xpack.securitySolution.search.administration.endpoints', {
          defaultMessage: 'Endpoints',
        }),
        order: 9006,
        path: ENDPOINTS_PATH,
      },
      {
        id: SecurityPageName.trustedApps,
        title: i18n.translate('xpack.securitySolution.search.administration.trustedApps', {
          defaultMessage: 'Trusted applications',
        }),
        path: TRUSTED_APPS_PATH,
      },
      {
        id: SecurityPageName.eventFilters,
        title: i18n.translate('xpack.securitySolution.search.administration.eventFilters', {
          defaultMessage: 'Event filters',
        }),
        path: EVENT_FILTERS_PATH,
      },
    ],
  },
};

/**
 * A function that generates the plugin deepLinks
 * @param licenseType optional string for license level, if not provided basic is assumed.
 */
export function getDeepLinks(
  licenseType?: LicenseType,
  capabilities?: ApplicationStart['capabilities']
): AppDeepLink[] {
  return topDeepLinks
    .filter(
      (deepLink) =>
        deepLink.id !== SecurityPageName.case ||
        capabilities == null ||
        (deepLink.id === SecurityPageName.case && capabilities.siem.read_cases === true)
    )
    .map((deepLink) => {
      const deepLinkId = deepLink.id as SecurityDeepLinkName;
      const subPluginDeepLinks = nestedDeepLinks[deepLinkId];
      const baseDeepLinks = Array.isArray(subPluginDeepLinks.base)
        ? [...subPluginDeepLinks.base]
        : [];
      if (
        deepLinkId === SecurityPageName.case &&
        capabilities != null &&
        capabilities.siem.crud_cases === false
      ) {
        return {
          ...deepLink,
          deepLinks: [],
        };
      }
      if (isPremiumLicense(licenseType) && subPluginDeepLinks?.premium) {
        return {
          ...deepLink,
          deepLinks: [...baseDeepLinks, ...subPluginDeepLinks.premium],
        };
      }
      return {
        ...deepLink,
        deepLinks: baseDeepLinks,
      };
    });
}

export function isPremiumLicense(licenseType?: LicenseType): boolean {
  return (
    licenseType === 'gold' ||
    licenseType === 'platinum' ||
    licenseType === 'enterprise' ||
    licenseType === 'trial'
  );
}

export function updateGlobalNavigation({
  capabilities,
  updater$,
}: {
  capabilities: ApplicationStart['capabilities'];
  updater$: Subject<AppUpdater>;
}) {
  const deepLinks = getDeepLinks(undefined, capabilities);
  const updatedDeepLinks = deepLinks.map((link) => {
    switch (link.id) {
      case SecurityPageName.case:
        return {
          ...link,
          navLinkStatus: capabilities.siem.read_cases
            ? AppNavLinkStatus.visible
            : AppNavLinkStatus.hidden,
          searchable: capabilities.siem.read_cases === true,
        };
      default:
        return link;
    }
  });

  updater$.next(() => ({
    navLinkStatus: AppNavLinkStatus.hidden, // needed to prevent showing main nav link
    deepLinks: updatedDeepLinks,
  }));
}
