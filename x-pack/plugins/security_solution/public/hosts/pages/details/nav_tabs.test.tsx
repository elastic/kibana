/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsTableType } from '../../store/model';
import { navTabsHostDetails } from './nav_tabs';

describe('navTabsHostDetails', () => {
  const mockHostName = 'mockHostName';
  test('it should skip anomalies tab if without mlUserPermission', () => {
    const tabs = navTabsHostDetails(mockHostName, false, false);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).not.toHaveProperty(HostsTableType.risk);
  });

  test('it should display anomalies tab if with mlUserPermission', () => {
    const tabs = navTabsHostDetails(mockHostName, true, false);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).not.toHaveProperty(HostsTableType.risk);
  });

  test('it should display risky hosts tab if when risky hosts is enabled', () => {
    const tabs = navTabsHostDetails(mockHostName, false, true);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).toHaveProperty(HostsTableType.risk);
  });
});
