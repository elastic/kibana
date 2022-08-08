/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSecuritySolutionNavTab as getSecuritySolutionCSPNavTab } from '@kbn/cloud-security-posture-plugin/public';
import { getSecuritySolutionNavTab as getSecuritySolutionTINavTab } from '@kbn/threat-intelligence-plugin/public';
import * as i18n from '../translations';
import type { SecurityNav, SecurityNavGroup } from '../../common/components/navigation/types';
import { SecurityNavGroupKey } from '../../common/components/navigation/types';
import {
  APP_OVERVIEW_PATH,
  APP_DETECTION_RESPONSE_PATH,
  APP_RULES_PATH,
  APP_ALERTS_PATH,
  APP_EXCEPTIONS_PATH,
  APP_HOSTS_PATH,
  APP_NETWORK_PATH,
  APP_TIMELINES_PATH,
  APP_CASES_PATH,
  APP_ENDPOINTS_PATH,
  APP_POLICIES_PATH,
  APP_TRUSTED_APPS_PATH,
  APP_EVENT_FILTERS_PATH,
  APP_BLOCKLIST_PATH,
  SecurityPageName,
  APP_HOST_ISOLATION_EXCEPTIONS_PATH,
  APP_USERS_PATH,
  APP_KUBERNETES_PATH,
  APP_LANDING_PATH,
  APP_RESPONSE_ACTIONS_PATH,
  APP_PATH,
} from '../../../common/constants';

export const navTabs: SecurityNav = {
  [SecurityPageName.landing]: {
    id: SecurityPageName.landing,
    name: i18n.GETTING_STARTED,
    href: APP_LANDING_PATH,
    disabled: false,
    urlKey: 'get_started',
  },
  [SecurityPageName.overview]: {
    id: SecurityPageName.overview,
    name: i18n.OVERVIEW,
    href: APP_OVERVIEW_PATH,
    disabled: false,
    urlKey: 'overview',
  },
  [SecurityPageName.detectionAndResponse]: {
    id: SecurityPageName.detectionAndResponse,
    name: i18n.DETECTION_RESPONSE,
    href: APP_DETECTION_RESPONSE_PATH,
    disabled: false,
    urlKey: 'detection_response',
  },
  [SecurityPageName.alerts]: {
    id: SecurityPageName.alerts,
    name: i18n.ALERTS,
    href: APP_ALERTS_PATH,
    disabled: false,
    urlKey: 'alerts',
  },
  [SecurityPageName.rules]: {
    id: SecurityPageName.rules,
    name: i18n.RULES,
    href: APP_RULES_PATH,
    disabled: false,
    urlKey: 'rules',
  },
  [SecurityPageName.exceptions]: {
    id: SecurityPageName.exceptions,
    name: i18n.EXCEPTIONS,
    href: APP_EXCEPTIONS_PATH,
    disabled: false,
    urlKey: 'exceptions',
  },
  [SecurityPageName.hosts]: {
    id: SecurityPageName.hosts,
    name: i18n.HOSTS,
    href: APP_HOSTS_PATH,
    disabled: false,
    urlKey: 'host',
  },
  [SecurityPageName.users]: {
    id: SecurityPageName.users,
    name: i18n.USERS,
    href: APP_USERS_PATH,
    disabled: false,
    urlKey: 'users',
  },
  [SecurityPageName.network]: {
    id: SecurityPageName.network,
    name: i18n.NETWORK,
    href: APP_NETWORK_PATH,
    disabled: false,
    urlKey: 'network',
  },
  [SecurityPageName.kubernetes]: {
    id: SecurityPageName.kubernetes,
    name: i18n.KUBERNETES,
    href: APP_KUBERNETES_PATH,
    disabled: false,
    urlKey: 'kubernetes',
  },
  [SecurityPageName.timelines]: {
    id: SecurityPageName.timelines,
    name: i18n.TIMELINES,
    href: APP_TIMELINES_PATH,
    disabled: false,
    urlKey: 'timeline',
  },
  [SecurityPageName.case]: {
    id: SecurityPageName.case,
    name: i18n.CASE,
    href: APP_CASES_PATH,
    disabled: false,
    urlKey: 'cases',
  },
  [SecurityPageName.endpoints]: {
    id: SecurityPageName.endpoints,
    name: i18n.ENDPOINTS,
    href: APP_ENDPOINTS_PATH,
    disabled: false,
    urlKey: 'administration',
  },
  [SecurityPageName.policies]: {
    id: SecurityPageName.policies,
    name: i18n.POLICIES,
    href: APP_POLICIES_PATH,
    disabled: false,
    urlKey: 'administration',
  },
  [SecurityPageName.trustedApps]: {
    id: SecurityPageName.trustedApps,
    name: i18n.TRUSTED_APPLICATIONS,
    href: APP_TRUSTED_APPS_PATH,
    disabled: false,
    urlKey: 'administration',
  },
  [SecurityPageName.eventFilters]: {
    id: SecurityPageName.eventFilters,
    name: i18n.EVENT_FILTERS,
    href: APP_EVENT_FILTERS_PATH,
    disabled: false,
    urlKey: 'administration',
  },
  [SecurityPageName.hostIsolationExceptions]: {
    id: SecurityPageName.hostIsolationExceptions,
    name: i18n.HOST_ISOLATION_EXCEPTIONS,
    href: APP_HOST_ISOLATION_EXCEPTIONS_PATH,
    disabled: false,
    urlKey: 'administration',
  },
  [SecurityPageName.blocklist]: {
    id: SecurityPageName.blocklist,
    name: i18n.BLOCKLIST,
    href: APP_BLOCKLIST_PATH,
    disabled: false,
    urlKey: 'administration',
  },
  [SecurityPageName.responseActions]: {
    id: SecurityPageName.responseActions,
    name: i18n.RESPONSE_ACTIONS,
    href: APP_RESPONSE_ACTIONS_PATH,
    disabled: false,
    urlKey: 'administration',
  },
  [SecurityPageName.threatIntelligenceIndicators]: {
    ...getSecuritySolutionTINavTab<SecurityPageName>('indicators', APP_PATH),
    urlKey: 'indicators',
  },
  [SecurityPageName.cloudSecurityPostureFindings]: {
    ...getSecuritySolutionCSPNavTab<SecurityPageName>('findings', APP_PATH),
    urlKey: 'findings',
  },
  [SecurityPageName.cloudSecurityPostureDashboard]: {
    ...getSecuritySolutionCSPNavTab<SecurityPageName>('dashboard', APP_PATH),
    urlKey: 'cloud_posture',
  },
  [SecurityPageName.cloudSecurityPostureBenchmarks]: {
    ...getSecuritySolutionCSPNavTab<SecurityPageName>('benchmarks', APP_PATH),
    urlKey: 'administration',
  },
  [SecurityPageName.cloudSecurityPostureRules]: {
    ...getSecuritySolutionCSPNavTab<SecurityPageName>('rules', APP_PATH),
    urlKey: 'administration',
  },
};

export const securityNavGroup: SecurityNavGroup = {
  [SecurityNavGroupKey.dashboards]: {
    id: SecurityNavGroupKey.dashboards,
    name: i18n.DASHBOARDS,
  },
  [SecurityNavGroupKey.detect]: {
    id: SecurityNavGroupKey.detect,
    name: i18n.DETECT,
  },
  [SecurityNavGroupKey.findings]: {
    id: SecurityNavGroupKey.findings,
    name: i18n.FINDINGS,
  },
  [SecurityNavGroupKey.explore]: {
    id: SecurityNavGroupKey.explore,
    name: i18n.EXPLORE,
  },
  [SecurityNavGroupKey.intelligence]: {
    id: SecurityNavGroupKey.intelligence,
    name: i18n.THREAT_INTELLIGENCE,
  },
  [SecurityNavGroupKey.investigate]: {
    id: SecurityNavGroupKey.investigate,
    name: i18n.INVESTIGATE,
  },
  [SecurityNavGroupKey.manage]: {
    id: SecurityNavGroupKey.manage,
    name: i18n.MANAGE,
  },
};
