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
import {
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  PUSH_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
} from '@kbn/cases-plugin/common';
import { AppDeepLink, AppNavLinkStatus, AppUpdater, Capabilities } from '@kbn/core/public';
import { Subject, Subscription } from 'rxjs';
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
  KUBERNETES,
  HOST_ISOLATION_EXCEPTIONS,
  EVENT_FILTERS,
  BLOCKLIST,
  TRUSTED_APPLICATIONS,
  POLICIES,
  ENDPOINTS,
  GETTING_STARTED,
  DASHBOARDS,
  CREATE_NEW_RULE,
  RESPONSE_ACTIONS,
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
  KUBERNETES_PATH,
  RULES_CREATE_PATH,
  RESPONSE_ACTIONS_PATH,
} from '../../../common/constants';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { subscribeAppLinks } from '../../common/links';
import { AppLinkItems } from '../../common/links/types';

const FEATURE = {
  general: `${SERVER_APP_ID}.show`,
  casesCreate: `${CASES_FEATURE_ID}.${CREATE_CASES_CAPABILITY}`,
  casesRead: `${CASES_FEATURE_ID}.${READ_CASES_CAPABILITY}`,
  casesUpdate: `${CASES_FEATURE_ID}.${UPDATE_CASES_CAPABILITY}`,
  casesDelete: `${CASES_FEATURE_ID}.${DELETE_CASES_CAPABILITY}`,
  casesPush: `${CASES_FEATURE_ID}.${PUSH_CASES_CAPABILITY}`,
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
    id: SecurityPageName.landing,
    title: GETTING_STARTED,
    path: LANDING_PATH,
    features: [FEATURE.general],
    keywords: [
      i18n.translate('xpack.securitySolution.search.getStarted', {
        defaultMessage: 'Getting started',
      }),
    ],
  },
  {
    id: SecurityPageName.dashboardsLanding,
    title: DASHBOARDS,
    path: OVERVIEW_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    searchable: false,
    order: 9000,
    features: [FEATURE.general],
    keywords: [
      i18n.translate('xpack.securitySolution.search.dashboards', {
        defaultMessage: 'Dashboards',
      }),
    ],
    deepLinks: [
      {
        id: SecurityPageName.overview,
        title: OVERVIEW,
        path: OVERVIEW_PATH,
        features: [FEATURE.general],
        keywords: [
          i18n.translate('xpack.securitySolution.search.overview', {
            defaultMessage: 'Overview',
          }),
        ],
      },
      {
        id: SecurityPageName.detectionAndResponse,
        title: DETECTION_RESPONSE,
        path: DETECTION_RESPONSE_PATH,
        features: [FEATURE.general],
        keywords: [
          i18n.translate('xpack.securitySolution.search.detectionAndResponse', {
            defaultMessage: 'Detection & Response',
          }),
        ],
      },
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
        order: 9001,
        keywords: [
          i18n.translate('xpack.securitySolution.search.alerts', {
            defaultMessage: 'Alerts',
          }),
        ],
      },
      {
        id: SecurityPageName.rules,
        title: RULES,
        path: RULES_PATH,
        keywords: [
          i18n.translate('xpack.securitySolution.search.rules', {
            defaultMessage: 'Rules',
          }),
        ],
        deepLinks: [
          {
            id: SecurityPageName.rulesCreate,
            title: CREATE_NEW_RULE,
            path: RULES_CREATE_PATH,
            navLinkStatus: AppNavLinkStatus.hidden,
            searchable: false,
          },
        ],
      },
      {
        id: SecurityPageName.exceptions,
        title: EXCEPTIONS,
        path: EXCEPTIONS_PATH,
        keywords: [
          i18n.translate('xpack.securitySolution.search.exceptions', {
            defaultMessage: 'Exception lists',
          }),
        ],
      },
    ],
  },
  {
    id: SecurityPageName.exploreLanding,
    title: EXPLORE,
    path: HOSTS_PATH,
    navLinkStatus: AppNavLinkStatus.visible,
    order: 9004,
    searchable: false,
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
        keywords: [
          i18n.translate('xpack.securitySolution.search.hosts', {
            defaultMessage: 'Hosts',
          }),
        ],
        deepLinks: [
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
            id: SecurityPageName.hostsRisk,
            title: i18n.translate('xpack.securitySolution.search.hosts.risk', {
              defaultMessage: 'Host risk',
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
        keywords: [
          i18n.translate('xpack.securitySolution.search.network', {
            defaultMessage: 'Network',
          }),
        ],
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
        keywords: [
          i18n.translate('xpack.securitySolution.search.users', {
            defaultMessage: 'Users',
          }),
        ],
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
              defaultMessage: 'User risk',
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
      {
        id: SecurityPageName.kubernetes,
        title: KUBERNETES,
        path: KUBERNETES_PATH,
        experimentalKey: 'kubernetesEnabled',
        keywords: [
          i18n.translate('xpack.securitySolution.search.kubernetes', {
            defaultMessage: 'Kubernetes',
          }),
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
        order: 9002,
        features: [FEATURE.general],
        keywords: [
          i18n.translate('xpack.securitySolution.search.timelines', {
            defaultMessage: 'Timelines',
          }),
        ],
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
            order: 9003,
            features: [FEATURE.casesRead],
          },
          [SecurityPageName.caseConfigure]: {
            features: [
              FEATURE.casesCreate,
              FEATURE.casesRead,
              FEATURE.casesUpdate,
              FEATURE.casesDelete,
              FEATURE.casesPush,
            ],
            isPremium: true,
          },
          // TODO: can we just use create here?
          [SecurityPageName.caseCreate]: {
            features: [
              FEATURE.casesCreate,
              FEATURE.casesRead,
              FEATURE.casesUpdate,
              FEATURE.casesDelete,
              FEATURE.casesPush,
            ],
          },
        },
      }),
    ],
  },
  {
    id: SecurityPageName.administration,
    title: MANAGE,
    path: ENDPOINTS_PATH,
    features: [FEATURE.general],
    navLinkStatus: AppNavLinkStatus.visible,
    order: 9005,
    searchable: false,
    keywords: [
      i18n.translate('xpack.securitySolution.search.manage', {
        defaultMessage: 'Manage',
      }),
    ],
    deepLinks: [
      {
        id: SecurityPageName.endpoints,
        title: ENDPOINTS,
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
      {
        id: SecurityPageName.responseActions,
        title: RESPONSE_ACTIONS,
        path: RESPONSE_ACTIONS_PATH,
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

/**
 * New deep links code starts here.
 * All the code above will be removed once the appLinks migration is over.
 * The code below manages the new implementation using the unified appLinks.
 */

const formatDeepLinks = (appLinks: AppLinkItems): AppDeepLink[] =>
  appLinks.map((appLink) => ({
    id: appLink.id,
    path: appLink.path,
    title: appLink.title,
    navLinkStatus: appLink.globalNavEnabled ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden,
    searchable: !appLink.globalSearchDisabled,
    ...(appLink.globalSearchKeywords != null ? { keywords: appLink.globalSearchKeywords } : {}),
    ...(appLink.globalNavOrder != null ? { order: appLink.globalNavOrder } : {}),
    ...(appLink.links && appLink.links?.length
      ? {
          deepLinks: formatDeepLinks(appLink.links),
        }
      : {}),
  }));

/**
 * Registers any change in appLinks to be updated in app deepLinks
 */
export const registerDeepLinksUpdater = (appUpdater$: Subject<AppUpdater>): Subscription => {
  return subscribeAppLinks((appLinks) => {
    appUpdater$.next(() => ({
      navLinkStatus: AppNavLinkStatus.hidden, // needed to prevent main security link to switch to visible after update
      deepLinks: formatDeepLinks(appLinks),
    }));
  });
};
