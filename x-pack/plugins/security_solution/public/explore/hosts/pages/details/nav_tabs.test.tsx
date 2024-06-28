/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TabNavigationItemProps } from '../../../../common/components/navigation/tab_navigation/types';
import { HostsTableType } from '../../store/model';
import { navTabsHostDetails } from './nav_tabs';

describe('navTabsHostDetails', () => {
  const mockHostName = 'mockHostName';
  test('it should skip anomalies tab if without mlUserPermission', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: false,
      hostName: mockHostName,
    });
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).toHaveProperty(HostsTableType.risk);
  });

  test('it should display anomalies tab if with mlUserPermission', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: true,
      hostName: mockHostName,
    });

    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).toHaveProperty(HostsTableType.risk);
  });

  test('it should display sessions tab when users are on Enterprise and above license', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: false,
      hostName: mockHostName,
      isEnterprise: true,
    });

    const sessionsTab = Object.values<TabNavigationItemProps>(tabs).find(
      (item) => item.id === HostsTableType.sessions
    );

    expect(sessionsTab).toBeTruthy();
  });

  test('it should not display sessions tab when users are not on Enterprise and above license', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: false,
      hostName: mockHostName,
      isEnterprise: false,
    });

    const sessionsTab = Object.values<TabNavigationItemProps>(tabs).find(
      (item) => item.id === HostsTableType.sessions
    );

    expect(sessionsTab).not.toBeTruthy();
  });
});
