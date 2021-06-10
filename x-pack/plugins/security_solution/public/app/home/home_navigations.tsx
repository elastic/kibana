/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';
import { SecurityPageName } from '../types';
import { SiemNavTab } from '../../common/components/navigation/types';
import {
  APP_OVERVIEW_PATH,
  APP_HOSTS_PATH,
  APP_NETWORK_PATH,
  APP_TIMELINES_PATH,
  APP_CASES_PATH,
  APP_MANAGEMENT_PATH,
  APP_RULES_PATH,
  APP_ALERTS_PATH,
} from '../../../common/constants';

export const navTabs: SiemNavTab = {
  [SecurityPageName.overview]: {
    id: SecurityPageName.overview,
    name: i18n.OVERVIEW,
    href: APP_OVERVIEW_PATH,
    disabled: false,
    urlKey: 'overview',
  },
  [SecurityPageName.detections]: {
    id: SecurityPageName.detections,
    name: i18n.ALERTS,
    href: APP_ALERTS_PATH,
    disabled: false,
    urlKey: SecurityPageName.detections,
  },
  [SecurityPageName.rules]: {
    id: SecurityPageName.rules,
    name: i18n.RULES,
    href: APP_RULES_PATH,
    disabled: false,
    urlKey: SecurityPageName.rules,
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
};
