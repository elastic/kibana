/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { get } from 'lodash';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { getCasesDeepLinks } from '@kbn/cases-plugin/public';
import { AppDeepLink, AppNavLinkStatus, Capabilities } from '@kbn/core/public';
import { SecurityPageName } from '../types';
import {
  OVERVIEW,
  DETECTION_RESPONSE,
  DETECT,
  ALERTS,
  RULES,
  EXCEPTIONS,
  EXPLORE,
  HOSTS,
  INVESTIGATE,
  NETWORK,
  TIMELINES,
  MANAGE,
  USERS,
  HOST_ISOLATION_EXCEPTIONS,
  EVENT_FILTERS,
  BLOCKLIST,
  TRUSTED_APPLICATIONS,
  POLICIES,
  ENDPOINTS,
  GETTING_STARTED,
} from '../translations';
import {
  OVERVIEW_PATH,
  LANDING_PATH,
  DETECTION_RESPONSE_PATH,
  ALERTS_PATH,
  RULES_PATH,
  EXCEPTIONS_PATH,
  HOSTS_PATH,
  NETWORK_PATH,
  TIMELINES_PATH,
  CASES_PATH,
  ENDPOINTS_PATH,
  POLICIES_PATH,
  TRUSTED_APPS_PATH,
  EVENT_FILTERS_PATH,
  BLOCKLIST_PATH,
  CASES_FEATURE_ID,
  HOST_ISOLATION_EXCEPTIONS_PATH,
  SERVER_APP_ID,
  USERS_PATH,
} from '../../../common/constants';
import { ExperimentalFeatures } from '../../../common/experimental_features';

const FEATURE = {
  general: `${SERVER_APP_ID}.show`,
  casesRead: `${CASES_FEATURE_ID}.read_cases`,
  casesCrud: `${CASES_FEATURE_ID}.crud_cases`,
} as const;

type Feature = typeof FEATURE[keyof typeof FEATURE];

type SecuritySolutionDeepLink = AppDeepLink & {
  isPremium?: boolean;
  features?: Feature[];
  /**
   * Displays deep link when feature flag is enabled.
   */
  experimentalKey?: keyof ExperimentalFeatures;
  /**
   * Hides deep link when feature flag is enabled.
   */
  hideWhenExperimentalKey?: keyof ExperimentalFeatures;
  deepLinks?: SecuritySolutionDeepLink[];
};

export const securitySolutionsDeepLinks: SecuritySolutionDeepLink[] = [
  {
    id: SecurityPageName.overview,
    title: OVERVIEW,
    path: OVERVIEW_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    features: [FEATURE.general],
    keywords: [
      i18n.translate('xpack.securitySolution.search.overview', {
        defaultMessage: 'Overview',
      }),
    ],
    order: 9000,
  },
  {
    id: SecurityPageName.landing,
    title: GETTING_STARTED,
    path: LANDING_PATH,
    navLinkStatus: AppNavLinkStatus.hidden,
    features: [FEATURE.general],
    keywords: [
      i18n.translate('xpack.securitySolution.search.getStarted', {
        defaultMessage: 'Getting started',
      }),
    ],
  },
  {
    id: SecurityPageName.detectionAndResponse,
    title: DETECTION_RESPONSE,
    path: DETECTION_RESPONSE_PATH,
    navLinkStatus: AppNavLinkStatus.hidden,
    experimentalKey: 'detectionResponseEnabled',
    features: [FEATURE.general],
    keywords: [
      i18n.translate('xpack.securitySolution.search.detectionAndResponse', {
        defaultMessage: 'Detection & Response',
      }),
    ],
  },
  {
    id: SecurityPageName.detections,
    title: DETECT,
    path: ALERTS_PATH,
    navLinkStatus: AppNavLinkStatus.hidden,
    features: [FEATURE.general],
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
            defaultMessage: 'Exception lists',
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
    features: [FEATURE.general],
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
            id: SecurityPageName.hostsAuthentications,
            title: i18n.translate('xpack.securitySolution.search.hosts.authentications', {
              defaultMessage: 'Authentications',
            }),
            path: `${HOSTS_PATH}/authentications`,
            hideWhenExperimentalKey: 'usersEnabled',
          },
          {
            id: SecurityPageName.uncommonProcesses,
            title: i18n.translate('xpack.securitySolution.search.hosts.uncommonProcesses', {
              defaultMessage: 'Uncommon Processes',
            }),
            path: `${HOSTS_PATH}/uncommonProcesses`,
          },
          {
            id: SecurityPageName.hostsAnomalies,
            title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
              defaultMessage: 'Anomalies',
            }),
            path: `${HOSTS_PATH}/anomalies`,
            isPremium: true,
          },
          {
            id: SecurityPageName.hostsEvents,
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
            id: SecurityPageName.usersRisk,
            title: i18n.translate('xpack.securitySolution.search.hosts.risk', {
              defaultMessage: 'Hosts by risk',
            }),
            path: `${HOSTS_PATH}/hostRisk`,
            experimentalKey: 'riskyHostsEnabled',
          },
          {
            id: SecurityPageName.sessions,
            title: i18n.translate('xpack.securitySolution.search.hosts.sessions', {
              defaultMessage: 'Sessions',
            }),
            path: `${HOSTS_PATH}/sessions`,
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
            isPremium: true,
          },
        ],
      },
      {
        id: SecurityPageName.users,
        title: USERS,
        path: USERS_PATH,
        navLinkStatus: AppNavLinkStatus.visible,
        experimentalKey: 'usersEnabled',
        keywords: [
          i18n.translate('xpack.securitySolution.search.users', {
            defaultMessage: 'Users',
          }),
        ],
        order: 9004,
        deepLinks: [
          {
            id: SecurityPageName.usersAuthentications,
            title: i18n.translate('xpack.securitySolution.search.users.authentications', {
              defaultMessage: 'Authentications',
            }),
            path: `${USERS_PATH}/authentications`,
          },
          {
            id: SecurityPageName.usersAnomalies,
            title: i18n.translate('xpack.securitySolution.search.users.anomalies', {
              defaultMessage: 'Anomalies',
            }),
            path: `${USERS_PATH}/anomalies`,
            isPremium: true,
          },
          {
            id: SecurityPageName.usersRisk,
            title: i18n.translate('xpack.securitySolution.search.users.risk', {
              defaultMessage: 'Users by risk',
            }),
            path: `${USERS_PATH}/userRisk`,
            experimentalKey: 'riskyUsersEnabled',
          },
          {
            id: SecurityPageName.usersEvents,
            title: i18n.translate('xpack.securitySolution.search.users.events', {
              defaultMessage: 'Events',
            }),
            path: `${USERS_PATH}/events`,
          },
          {
            id: SecurityPageName.usersExternalAlerts,
            title: i18n.translate('xpack.securitySolution.search.users.externalAlerts', {
              defaultMessage: 'External Alerts',
            }),
            path: `${USERS_PATH}/externalAlerts`,
          },
        ],
      },
    ],
  },
  {
    id: SecurityPageName.investigate,
    title: INVESTIGATE,
    navLinkStatus: AppNavLinkStatus.hidden,
    features: [FEATURE.general, FEATURE.casesRead],
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
        features: [FEATURE.general],
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
      getCasesDeepLinks<SecuritySolutionDeepLink>({
        basePath: CASES_PATH,
        extend: {
          [SecurityPageName.case]: {
            navLinkStatus: AppNavLinkStatus.visible,
            order: 9006,
            features: [FEATURE.casesRead],
          },
          [SecurityPageName.caseConfigure]: {
            features: [FEATURE.casesCrud],
            isPremium: true,
          },
          [SecurityPageName.caseCreate]: {
            features: [FEATURE.casesCrud],
          },
        },
      }),
    ],
  },
  {
    id: SecurityPageName.administration,
    title: MANAGE,
    path: ENDPOINTS_PATH,
    navLinkStatus: AppNavLinkStatus.hidden,
    features: [FEATURE.general],
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
        id: SecurityPageName.policies,
        title: POLICIES,
        path: POLICIES_PATH,
        experimentalKey: 'policyListEnabled',
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
      {
        id: SecurityPageName.blocklist,
        title: BLOCKLIST,
        path: BLOCKLIST_PATH,
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
  capabilities?: Capabilities
): AppDeepLink[] {
  const filterDeepLinks = (securityDeepLinks: SecuritySolutionDeepLink[]): AppDeepLink[] =>
    securityDeepLinks.reduce(
      (
        deepLinks: AppDeepLink[],
        { isPremium, features, experimentalKey, hideWhenExperimentalKey, ...deepLink }
      ) => {
        if (licenseType && isPremium && !isPremiumLicense(licenseType)) {
          return deepLinks;
        }
        if (experimentalKey && !enableExperimental[experimentalKey]) {
          return deepLinks;
        }

        if (hideWhenExperimentalKey && enableExperimental[hideWhenExperimentalKey]) {
          return deepLinks;
        }

        if (capabilities != null && !hasFeaturesCapability(features, capabilities)) {
          return deepLinks;
        }
        if (deepLink.deepLinks) {
          deepLinks.push({ ...deepLink, deepLinks: filterDeepLinks(deepLink.deepLinks) });
        } else {
          deepLinks.push(deepLink);
        }
        return deepLinks;
      },
      []
    );
  return filterDeepLinks(securitySolutionsDeepLinks);
}

function hasFeaturesCapability(
  features: Feature[] | undefined,
  capabilities: Capabilities
): boolean {
  if (!features) {
    return true;
  }
  return features.some((featureKey) => get(capabilities, featureKey, false));
}

export function isPremiumLicense(licenseType?: LicenseType): boolean {
  return (
    licenseType === 'gold' ||
    licenseType === 'platinum' ||
    licenseType === 'enterprise' ||
    licenseType === 'trial'
  );
}
