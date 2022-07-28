/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { navTabsNetworkDetails } from './nav_tabs';
import { NetworkDetailsRouteType } from './types';

describe('navTabsNetworkDetails', () => {
  test('it to return all tabs if user has ML capabilities', () => {
    const tabs = navTabsNetworkDetails('username', true, FlowTargetSourceDest.source);
    expect(tabs).toEqual(mockTabs);
  });

  test('it should not display anomalies tab if user has no ml permission', () => {
    const tabs = navTabsNetworkDetails('username', false, FlowTargetSourceDest.source);

    expect(tabs).not.toHaveProperty(NetworkDetailsRouteType.anomalies);
  });
});

const mockTabs = {
  flows: {
    id: 'flows',
    name: 'Flows',
    href: '/network/username/flows/source',
    disabled: false,
  },
  users: {
    id: 'users',
    name: 'Users',
    href: '/network/username/users/source',
    disabled: false,
  },
  http: {
    id: 'http',
    name: 'HTTP',
    href: '/network/username/http/source',
    disabled: false,
  },
  tls: {
    id: 'tls',
    name: 'TLS',
    href: '/network/username/tls/source',
    disabled: false,
  },
  anomalies: {
    id: 'anomalies',
    name: 'Anomalies',
    href: '/network/username/anomalies/source',
    disabled: false,
  },
  events: {
    id: 'events',
    name: 'Events',
    href: '/network/username/events/source',
    disabled: false,
  },
};
