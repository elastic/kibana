/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { navTabsNetworkDetails } from './nav_tabs';
import { NetworkDetailsRouteType } from './types';

describe('navTabsNetworkDetails', () => {
  test('it should return all tabs if user has ML capabilities', () => {
    const tabs = navTabsNetworkDetails('<ip-address>', true, FlowTargetSourceDest.source);
    expect(tabs).toEqual(mockTabs);
  });

  test('it should not display anomalies tab if user has no ml permission', () => {
    const tabs = navTabsNetworkDetails('<ip-address>', false, FlowTargetSourceDest.source);

    expect(tabs).not.toHaveProperty(NetworkDetailsRouteType.anomalies);
  });
});

const mockTabs = {
  flows: {
    id: 'flows',
    name: 'Flows',
    href: '/network/ip/<ip-address>/source/flows',
    disabled: false,
  },
  users: {
    id: 'users',
    name: 'Users',
    href: '/network/ip/<ip-address>/source/users',
    disabled: false,
  },
  http: {
    id: 'http',
    name: 'HTTP',
    href: '/network/ip/<ip-address>/source/http',
    disabled: false,
  },
  tls: {
    id: 'tls',
    name: 'TLS',
    href: '/network/ip/<ip-address>/source/tls',
    disabled: false,
  },
  anomalies: {
    id: 'anomalies',
    name: 'Anomalies',
    href: '/network/ip/<ip-address>/source/anomalies',
    disabled: false,
  },
  events: {
    id: 'events',
    name: 'Events',
    href: '/network/ip/<ip-address>/source/events',
    disabled: false,
  },
};
