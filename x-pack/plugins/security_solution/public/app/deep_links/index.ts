/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';

import { LicenseType } from '../../../../licensing/common/types';
import { SecurityPageName } from '../types';
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
  EXPLORE,
  HOSTS,
  INVESTIGATE,
  NETWORK,
  TIMELINES,
  CASE,
  MANAGE,
  UEBA,
  HOST_ISOLATION_EXCEPTIONS,
  EVENT_FILTERS,
  TRUSTED_APPLICATIONS,
  ENDPOINTS,
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
  UEBA_PATH,
  CASES_FEATURE_ID,
  HOST_ISOLATION_EXCEPTIONS_PATH,
} from '../../../common/constants';
import { ExperimentalFeatures } from '../../../common/experimental_features';

export const PREMIUM_DEEP_LINK_IDS: Set<string> = new Set([
  SecurityPageName.hostsAnomalies,
  SecurityPageName.networkAnomalies,
  SecurityPageName.caseConfigure,
]);

export const securitySolutionsDeepLinks: AppDeepLink[] = [
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
    deepLinks: [
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
  {
    id: SecurityPageName.explore,
    title: EXPLORE,
    navLinkStatus: AppNavLinkStatus.hidden,
    keywords: [
      i18n.translate('xpack.securitySolution.search.explore', {
        defaultMessage: 'Explore',
      }),
    ],
    deepLinks: [
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
        deepLinks: [
          {
            id: SecurityPageName.authentications,
            title: i18n.translate('xpack.securitySolution.search.hosts.authentications', {
              defaultMessage: 'Authentications',
            }),
            path: `${HOSTS_PATH}/authentications`,
          },
          {
            id: SecurityPageName.uncommonProcesses,
            title: i18n.translate('xpack.securitySolution.search.hosts.uncommonProcesses', {
              defaultMessage: 'Uncommon Processes',
            }),
            path: `${HOSTS_PATH}/uncommonProcesses`,
          },
          {
            id: SecurityPageName.events,
            title: i18n.translate('xpack.securitySolution.search.hosts.events', {
              defaultMessage: 'Events',
            }),
            path: `${HOSTS_PATH}/events`,
          },
          {
            id: SecurityPageName.hostsExternalAlerts,
            title: i18n.translate('xpack.securitySolution.search.hosts.externalAlerts', {
              defaultMessage: 'External Alerts',
            }),
            path: `${HOSTS_PATH}/externalAlerts`,
          },
          {
            id: SecurityPageName.hostsAnomalies,
            title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
              defaultMessage: 'Anomalies',
            }),
            path: `${HOSTS_PATH}/anomalies`,
          },
        ],
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
        deepLinks: [
          {
            id: SecurityPageName.networkDns,
            title: i18n.translate('xpack.securitySolution.search.network.dns', {
              defaultMessage: 'DNS',
            }),
            path: `${NETWORK_PATH}/dns`,
          },
          {
            id: SecurityPageName.networkHttp,
            title: i18n.translate('xpack.securitySolution.search.network.http', {
              defaultMessage: 'HTTP',
            }),
            path: `${NETWORK_PATH}/http`,
          },
          {
            id: SecurityPageName.networkTls,
            title: i18n.translate('xpack.securitySolution.search.network.tls', {
              defaultMessage: 'TLS',
            }),
            path: `${NETWORK_PATH}/tls`,
          },
          {
            id: SecurityPageName.networkExternalAlerts,
            title: i18n.translate('xpack.securitySolution.search.network.externalAlerts', {
              defaultMessage: 'External Alerts',
            }),
            path: `${NETWORK_PATH}/external-alerts`,
          },
          {
            id: SecurityPageName.networkAnomalies,
            title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
              defaultMessage: 'Anomalies',
            }),
            path: `${NETWORK_PATH}/anomalies`,
          },
        ],
      },
    ],
  },
  {
    id: SecurityPageName.ueba,
    title: UEBA,
    path: UEBA_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    keywords: [
      i18n.translate('xpack.securitySolution.search.ueba', {
        defaultMessage: 'Users & Entities',
      }),
    ],
    order: 9004,
  },
  {
    id: SecurityPageName.investigate,
    title: INVESTIGATE,
    navLinkStatus: AppNavLinkStatus.hidden,
    keywords: [
      i18n.translate('xpack.securitySolution.search.investigate', {
        defaultMessage: 'Investigate',
      }),
    ],
    deepLinks: [
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
        order: 9005,
        deepLinks: [
          {
            id: SecurityPageName.timelinesTemplates,
            title: i18n.translate('xpack.securitySolution.search.timeline.templates', {
              defaultMessage: 'Templates',
            }),
            path: `${TIMELINES_PATH}/template`,
          },
        ],
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
        order: 9006,
        deepLinks: [
          {
            id: SecurityPageName.caseCreate,
            title: i18n.translate('xpack.securitySolution.search.cases.create', {
              defaultMessage: 'Create New Case',
            }),
            path: `${CASES_PATH}/create`,
          },
          {
            id: SecurityPageName.caseConfigure,
            title: i18n.translate('xpack.securitySolution.search.cases.configure', {
              defaultMessage: 'Configure Cases',
            }),
            path: `${CASES_PATH}/configure`,
          },
        ],
      },
    ],
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
    deepLinks: [
      {
        id: SecurityPageName.endpoints,
        navLinkStatus: AppNavLinkStatus.visible,
        title: ENDPOINTS,
        order: 9006,
        path: ENDPOINTS_PATH,
      },
      {
        id: SecurityPageName.trustedApps,
        title: TRUSTED_APPLICATIONS,
        path: TRUSTED_APPS_PATH,
      },
      {
        id: SecurityPageName.eventFilters,
        title: EVENT_FILTERS,
        path: EVENT_FILTERS_PATH,
      },
      {
        id: SecurityPageName.hostIsolationExceptions,
        title: HOST_ISOLATION_EXCEPTIONS,
        path: HOST_ISOLATION_EXCEPTIONS_PATH,
      },
    ],
  },
];

/**
 * A function that generates the plugin deepLinks structure
 * used by Kibana to build the global side navigation and application search results
 * @param enableExperimental ExperimentalFeatures arg
 * @param licenseType optional string for license level, if not provided basic is assumed.
 * @param capabilities optional arg for app start capabilities
 */
export function getDeepLinks(
  enableExperimental: ExperimentalFeatures,
  licenseType?: LicenseType,
  capabilities?: ApplicationStart['capabilities']
): AppDeepLink[] {
  const isPremium = isPremiumLicense(licenseType);

  const filterDeepLinks = (deepLinks: AppDeepLink[]): AppDeepLink[] => {
    return deepLinks
      .filter((deepLink) => {
        if (!isPremium && PREMIUM_DEEP_LINK_IDS.has(deepLink.id)) {
          return false;
        }
        if (deepLink.id === SecurityPageName.case) {
          return capabilities == null || capabilities[CASES_FEATURE_ID].read_cases === true;
        }
        if (deepLink.id === SecurityPageName.ueba) {
          return enableExperimental.uebaEnabled;
        }
        return true;
      })
      .map((deepLink) => {
        if (
          deepLink.id === SecurityPageName.case &&
          capabilities != null &&
          capabilities[CASES_FEATURE_ID].crud_cases === false
        ) {
          return {
            ...deepLink,
            deepLinks: [],
          };
        }
        if (deepLink.deepLinks) {
          return {
            ...deepLink,
            deepLinks: filterDeepLinks(deepLink.deepLinks),
          };
        }
        return deepLink;
      });
  };

  return filterDeepLinks(securitySolutionsDeepLinks);
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
  enableExperimental,
}: {
  capabilities: ApplicationStart['capabilities'];
  updater$: Subject<AppUpdater>;
  enableExperimental: ExperimentalFeatures;
}) {
  updater$.next(() => ({
    navLinkStatus: AppNavLinkStatus.hidden, // needed to prevent showing main nav link
    deepLinks: getDeepLinks(enableExperimental, undefined, capabilities),
  }));
}
