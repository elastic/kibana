/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsTableType } from '../store/model';
import { navTabsHosts } from './nav_tabs';

describe('navTabsHosts', () => {
  test('it should skip anomalies tab if without mlUserPermission', () => {
    const tabs = navTabsHosts(false, false);
    expect(tabs).toHaveProperty(HostsTableType.hosts);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });

  test('it should display anomalies tab if with mlUserPermission', () => {
    const tabs = navTabsHosts(true, false);
    expect(tabs).toHaveProperty(HostsTableType.hosts);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });
  test('it should skip risk tab if without hostRisk', () => {
    const tabs = navTabsHosts(false, false);
    expect(tabs).toHaveProperty(HostsTableType.hosts);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.risk);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });

  test('it should display risk tab if with hostRisk', () => {
    const tabs = navTabsHosts(false, true);
    expect(tabs).toHaveProperty(HostsTableType.hosts);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).toHaveProperty(HostsTableType.risk);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });
});
