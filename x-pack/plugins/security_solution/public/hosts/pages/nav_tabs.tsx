/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import * as i18n from './translations';
import { HostsTableType } from '../store/model';
import { HostsNavTab } from './navigation/types';
import { SecurityPageName } from '../../app/types';

const getTabsOnHostsUrl = (tabName: HostsTableType) => `/${tabName}`;

export const navTabsHosts = (hasMlUserPermissions: boolean): HostsNavTab => {
  const hostsNavTabs = {
    [HostsTableType.hosts]: {
      id: HostsTableType.hosts,
      name: i18n.NAVIGATION_ALL_HOSTS_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.hosts),
      disabled: false,
      urlKey: 'host',
      pageId: SecurityPageName.hosts,
    },
    [HostsTableType.authentications]: {
      id: HostsTableType.authentications,
      name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.authentications),
      disabled: false,
      urlKey: 'host',
      pageId: SecurityPageName.hosts,
    },
    [HostsTableType.uncommonProcesses]: {
      id: HostsTableType.uncommonProcesses,
      name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.uncommonProcesses),
      disabled: false,
      urlKey: 'host',
      pageId: SecurityPageName.hosts,
    },
    [HostsTableType.anomalies]: {
      id: HostsTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.anomalies),
      disabled: false,
      urlKey: 'host',
      pageId: SecurityPageName.hosts,
    },
    [HostsTableType.events]: {
      id: HostsTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.events),
      disabled: false,
      urlKey: 'host',
      pageId: SecurityPageName.hosts,
    },
    [HostsTableType.alerts]: {
      id: HostsTableType.alerts,
      name: i18n.NAVIGATION_ALERTS_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.alerts),
      disabled: false,
      urlKey: 'host',
      pageId: SecurityPageName.hosts,
    },
  };

  return hasMlUserPermissions ? hostsNavTabs : omit([HostsTableType.anomalies], hostsNavTabs);
};
