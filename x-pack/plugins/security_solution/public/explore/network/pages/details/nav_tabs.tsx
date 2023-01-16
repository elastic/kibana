/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { NETWORK_PATH } from '../../../../../common/constants';
import * as i18n from '../translations';
import type { NetworkDetailsNavTabs } from './types';
import { NetworkDetailsRouteType } from './types';

const getTabsOnNetworkDetailsUrl = (
  ipAddress: string,
  tabName: NetworkDetailsRouteType,
  flowTarget: FlowTargetSourceDest
) => `${NETWORK_PATH}/ip/${ipAddress}/${flowTarget}/${tabName}`;

export const navTabsNetworkDetails = (
  ipAddress: string,
  hasMlUserPermissions: boolean,
  flowTarget: FlowTargetSourceDest
): NetworkDetailsNavTabs => {
  const networkDetailsNavTabs: NetworkDetailsNavTabs = {
    [NetworkDetailsRouteType.flows]: {
      id: NetworkDetailsRouteType.flows,
      name: i18n.NAVIGATION_FLOWS_TITLE,
      href: getTabsOnNetworkDetailsUrl(ipAddress, NetworkDetailsRouteType.flows, flowTarget),
      disabled: false,
    },
    [NetworkDetailsRouteType.users]: {
      id: NetworkDetailsRouteType.users,
      name: i18n.NAVIGATION_USERS_TITLE,
      href: getTabsOnNetworkDetailsUrl(ipAddress, NetworkDetailsRouteType.users, flowTarget),
      disabled: false,
    },
    [NetworkDetailsRouteType.http]: {
      id: NetworkDetailsRouteType.http,
      name: i18n.NAVIGATION_HTTP_TITLE,
      href: getTabsOnNetworkDetailsUrl(ipAddress, NetworkDetailsRouteType.http, flowTarget),
      disabled: false,
    },
    [NetworkDetailsRouteType.tls]: {
      id: NetworkDetailsRouteType.tls,
      name: i18n.NAVIGATION_TLS_TITLE,
      href: getTabsOnNetworkDetailsUrl(ipAddress, NetworkDetailsRouteType.tls, flowTarget),
      disabled: false,
    },
    [NetworkDetailsRouteType.anomalies]: {
      id: NetworkDetailsRouteType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnNetworkDetailsUrl(ipAddress, NetworkDetailsRouteType.anomalies, flowTarget),
      disabled: false,
    },
    [NetworkDetailsRouteType.events]: {
      id: NetworkDetailsRouteType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnNetworkDetailsUrl(ipAddress, NetworkDetailsRouteType.events, flowTarget),
      disabled: false,
    },
  };

  if (!hasMlUserPermissions) {
    delete networkDetailsNavTabs.anomalies;
  }

  return networkDetailsNavTabs;
};
