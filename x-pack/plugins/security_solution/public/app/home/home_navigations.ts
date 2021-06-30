/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';
import { SecurityPageName, SecurityPageGroupName } from '../types';
import { SiemNavTab, NavTabGroups } from '../../common/components/navigation/types';
import {
  APP_OVERVIEW_PATH,
  APP_RULES_PATH,
  APP_ALERTS_PATH,
  APP_EXCEPTIONS_PATH,
  APP_HOSTS_PATH,
  APP_NETWORK_PATH,
  APP_TIMELINES_PATH,
  APP_CASES_PATH,
  APP_MANAGEMENT_PATH,
  APP_ENDPOINTS_PATH,
  APP_TRUSTED_APPS_PATH,
  APP_EVENT_FILTERS_PATH,
  APP_UEBA_PATH,
} from '../../../common/constants';

export const navTabs: SiemNavTab = {
  [SecurityPageName.overview]: {
    id: SecurityPageName.overview,
    name: i18n.OVERVIEW,
    href: APP_OVERVIEW_PATH,
    disabled: false,
    urlKey: 'overview',
  },
  [SecurityPageName.alerts]: {
    id: SecurityPageName.alerts,
    name: i18n.ALERTS,
    href: APP_ALERTS_PATH,
    disabled: false,
    urlKey: SecurityPageName.alerts,
  },
  [SecurityPageName.rules]: {
    id: SecurityPageName.rules,
    name: i18n.RULES,
    href: APP_RULES_PATH,
    disabled: false,
    urlKey: SecurityPageName.rules,
  },
  [SecurityPageName.exceptions]: {
    id: SecurityPageName.exceptions,
    name: i18n.EXCEPTIONS,
    href: APP_EXCEPTIONS_PATH,
    disabled: false,
    urlKey: SecurityPageName.exceptions,
  },
  [SecurityPageName.hosts]: {
    id: SecurityPageName.hosts,
    name: i18n.HOSTS,
    href: APP_HOSTS_PATH,
    disabled: false,
    urlKey: 'host',
  },
  [SecurityPageName.network]: {
    id: SecurityPageName.network,
    name: i18n.NETWORK,
    href: APP_NETWORK_PATH,
    disabled: false,
    urlKey: 'network',
  },
  [SecurityPageName.ueba]: {
    id: SecurityPageName.ueba,
    name: i18n.UEBA,
    href: APP_UEBA_PATH,
    disabled: false,
    urlKey: 'ueba',
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
    urlKey: 'case',
  },
  [SecurityPageName.administration]: {
    id: SecurityPageName.administration,
    name: i18n.ADMINISTRATION,
    href: APP_MANAGEMENT_PATH,
    disabled: false,
    urlKey: SecurityPageName.administration,
  },
  [SecurityPageName.endpoints]: {
    id: SecurityPageName.endpoints,
    name: i18n.ENDPOINTS,
    href: APP_ENDPOINTS_PATH,
    disabled: false,
    urlKey: SecurityPageName.administration,
  },
  [SecurityPageName.trustedApps]: {
    id: SecurityPageName.trustedApps,
    name: i18n.TRUSTED_APPLICATIONS,
    href: APP_TRUSTED_APPS_PATH,
    disabled: false,
    urlKey: SecurityPageName.administration,
  },
  [SecurityPageName.eventFilters]: {
    id: SecurityPageName.eventFilters,
    name: i18n.EVENT_FILTERS,
    href: APP_EVENT_FILTERS_PATH,
    disabled: false,
    urlKey: SecurityPageName.administration,
  },
};

export const navTabGroups: NavTabGroups = {
  [SecurityPageGroupName.detect]: {
    id: SecurityPageGroupName.detect,
    name: i18n.DETECT,
  },
  [SecurityPageGroupName.explore]: {
    id: SecurityPageGroupName.explore,
    name: i18n.EXPLORE,
  },
  [SecurityPageGroupName.investigate]: {
    id: SecurityPageGroupName.investigate,
    name: i18n.INVESTIGATE,
  },
  [SecurityPageGroupName.manage]: {
    id: SecurityPageGroupName.manage,
    name: i18n.MANAGE,
  },
};
