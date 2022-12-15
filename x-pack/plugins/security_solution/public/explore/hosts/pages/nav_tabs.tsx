/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import * as i18n from './translations';
import { HostsTableType } from '../store/model';
import type { HostsNavTab } from './navigation/types';
import { HOSTS_PATH } from '../../../../common/constants';
import { TECHNICAL_PREVIEW } from '../../../overview/pages/translations';

const getTabsOnHostsUrl = (tabName: HostsTableType) => `${HOSTS_PATH}/${tabName}`;

export const navTabsHosts = ({
  hasMlUserPermissions,
  isRiskyHostsEnabled,
  isEnterprise,
}: {
  hasMlUserPermissions: boolean;
  isRiskyHostsEnabled: boolean;
  isEnterprise?: boolean;
}): HostsNavTab => {
  const hiddenTabs = [];
  const hostsNavTabs = {
    [HostsTableType.hosts]: {
      id: HostsTableType.hosts,
      name: i18n.NAVIGATION_ALL_HOSTS_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.hosts),
      disabled: false,
    },
    [HostsTableType.uncommonProcesses]: {
      id: HostsTableType.uncommonProcesses,
      name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.uncommonProcesses),
      disabled: false,
    },
    [HostsTableType.anomalies]: {
      id: HostsTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.anomalies),
      disabled: false,
    },
    [HostsTableType.events]: {
      id: HostsTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.events),
      disabled: false,
    },
    [HostsTableType.risk]: {
      id: HostsTableType.risk,
      name: i18n.NAVIGATION_HOST_RISK_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.risk),
      disabled: false,
      isBeta: true,
      betaOptions: {
        text: TECHNICAL_PREVIEW,
      },
    },
    [HostsTableType.sessions]: {
      id: HostsTableType.sessions,
      name: i18n.NAVIGATION_SESSIONS_TITLE,
      href: getTabsOnHostsUrl(HostsTableType.sessions),
      disabled: false,
      isBeta: false,
    },
  };

  if (!hasMlUserPermissions) {
    hiddenTabs.push(HostsTableType.anomalies);
  }

  if (!isRiskyHostsEnabled) {
    hiddenTabs.push(HostsTableType.risk);
  }

  if (!isEnterprise) {
    hiddenTabs.push(HostsTableType.sessions);
  }

  return omit(hiddenTabs, hostsNavTabs);
};
