/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getDetectionEngineUrl,
  getOverviewUrl,
  getNetworkUrl,
  getTimelinesUrl,
  getHostsUrl,
  getCaseUrl,
} from '../../common/components/link_to';
import * as i18n from './translations';
import { SecurityPageName, SiemNavTab } from '../types';
import { getManagementUrl } from '../../management';

export const navTabs: SiemNavTab = {
  [SecurityPageName.overview]: {
    id: SecurityPageName.overview,
    name: i18n.OVERVIEW,
    href: getOverviewUrl(),
    disabled: false,
    urlKey: 'overview',
  },
  [SecurityPageName.hosts]: {
    id: SecurityPageName.hosts,
    name: i18n.HOSTS,
    href: getHostsUrl(),
    disabled: false,
    urlKey: 'host',
  },
  [SecurityPageName.network]: {
    id: SecurityPageName.network,
    name: i18n.NETWORK,
    href: getNetworkUrl(),
    disabled: false,
    urlKey: 'network',
  },
  [SecurityPageName.detections]: {
    id: SecurityPageName.detections,
    name: i18n.DETECTION_ENGINE,
    href: getDetectionEngineUrl(),
    disabled: false,
    urlKey: 'detections',
  },
  [SecurityPageName.timelines]: {
    id: SecurityPageName.timelines,
    name: i18n.TIMELINES,
    href: getTimelinesUrl(),
    disabled: false,
    urlKey: 'timeline',
  },
  [SecurityPageName.case]: {
    id: SecurityPageName.case,
    name: i18n.CASE,
    href: getCaseUrl(null),
    disabled: false,
    urlKey: 'case',
  },
  [SecurityPageName.management]: {
    id: SecurityPageName.management,
    name: i18n.MANAGEMENT,
    href: getManagementUrl({ name: 'default' }),
    disabled: false,
    urlKey: SecurityPageName.management,
  },
};
