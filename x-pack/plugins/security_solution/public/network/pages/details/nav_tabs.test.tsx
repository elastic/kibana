/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navTabsNetworkDetails } from './nav_tabs';
import { NetworkDetailsRouteType } from './types';

describe('navTabsNetworkDetails', () => {
  test('it should not display anomalies tab if user has no ml permission', () => {
    const tabs = navTabsNetworkDetails('username', false);

    expect(tabs).not.toHaveProperty(NetworkDetailsRouteType.anomalies);
  });

  test('it should not display risk tab if isRiskyUserEnabled disabled', () => {
    const tabs = navTabsNetworkDetails('username', true);
    expect(tabs).toHaveProperty(NetworkDetailsRouteType.anomalies);
  });
});
