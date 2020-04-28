/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import * as i18n from './../translations';
import { HostDetailsNavTab } from './types';
import { HostsTableType } from '../../../store/hosts/model';
import { SiemPageName } from '../../home/types';

const getTabsOnHostDetailsUrl = (hostName: string, tabName: HostsTableType) =>
  `#/${SiemPageName.hosts}/${hostName}/${tabName}`;

export const navTabsHostDetails = (
  hostName: string,
  hasMlUserPermissions: boolean
): HostDetailsNavTab => {
  const hostDetailsNavTabs = {
    [HostsTableType.authentications]: {
      id: HostsTableType.authentications,
      name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
      href: getTabsOnHostDetailsUrl(hostName, HostsTableType.authentications),
      disabled: false,
      urlKey: 'host',
      isDetailPage: true,
    },
    [HostsTableType.uncommonProcesses]: {
      id: HostsTableType.uncommonProcesses,
      name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
      href: getTabsOnHostDetailsUrl(hostName, HostsTableType.uncommonProcesses),
      disabled: false,
      urlKey: 'host',
      isDetailPage: true,
    },
    [HostsTableType.anomalies]: {
      id: HostsTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnHostDetailsUrl(hostName, HostsTableType.anomalies),
      disabled: false,
      urlKey: 'host',
      isDetailPage: true,
    },
    [HostsTableType.events]: {
      id: HostsTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnHostDetailsUrl(hostName, HostsTableType.events),
      disabled: false,
      urlKey: 'host',
      isDetailPage: true,
    },
    [HostsTableType.alerts]: {
      id: HostsTableType.alerts,
      name: i18n.NAVIGATION_ALERTS_TITLE,
      href: getTabsOnHostDetailsUrl(hostName, HostsTableType.alerts),
      disabled: false,
      urlKey: 'host',
    },
  };

  return hasMlUserPermissions
    ? hostDetailsNavTabs
    : omit(HostsTableType.anomalies, hostDetailsNavTabs);
};
