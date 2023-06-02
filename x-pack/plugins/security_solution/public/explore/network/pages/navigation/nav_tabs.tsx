/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import * as i18n from '../translations';
import type { NetworkNavTab } from './types';
import { NetworkRouteType } from './types';
import { NETWORK_PATH } from '../../../../../common/constants';

const getTabsOnNetworkUrl = (tabName: NetworkRouteType) => `${NETWORK_PATH}/${tabName}`;

export const navTabsNetwork = (hasMlUserPermissions: boolean): NetworkNavTab => {
  const networkNavTabs = {
    [NetworkRouteType.flows]: {
      id: NetworkRouteType.flows,
      name: i18n.NAVIGATION_FLOWS_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.flows),
      disabled: false,
    },
    [NetworkRouteType.dns]: {
      id: NetworkRouteType.dns,
      name: i18n.NAVIGATION_DNS_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.dns),
      disabled: false,
    },
    [NetworkRouteType.http]: {
      id: NetworkRouteType.http,
      name: i18n.NAVIGATION_HTTP_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.http),
      disabled: false,
    },
    [NetworkRouteType.tls]: {
      id: NetworkRouteType.tls,
      name: i18n.NAVIGATION_TLS_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.tls),
      disabled: false,
    },
    [NetworkRouteType.anomalies]: {
      id: NetworkRouteType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.anomalies),
      disabled: false,
    },
    [NetworkRouteType.events]: {
      id: NetworkRouteType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.events),
      disabled: false,
    },
  };

  return hasMlUserPermissions ? networkNavTabs : omit([NetworkRouteType.anomalies], networkNavTabs);
};
