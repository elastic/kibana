/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TabNavigationItemProps } from '../../../common/components/navigation/tab_navigation/types';
import { HostsTableType } from '../../store/model';
import { navTabsHostDetails } from './nav_tabs';

describe('navTabsHostDetails', () => {
  const mockHostName = 'mockHostName';
  test('it should skip anomalies tab if without mlUserPermission', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: false,
      isRiskyHostsEnabled: false,
      hostName: mockHostName,
    });
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).not.toHaveProperty(HostsTableType.risk);
  });

  test('it should display anomalies tab if with mlUserPermission', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: true,
      isRiskyHostsEnabled: false,
      hostName: mockHostName,
    });

    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).not.toHaveProperty(HostsTableType.risk);
  });

  test('it should display risky hosts tab if when risky hosts is enabled', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: false,
      isRiskyHostsEnabled: true,
      hostName: mockHostName,
    });

    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
    expect(tabs).toHaveProperty(HostsTableType.risk);
  });

  test('it should display Beta badge for sessions tab only', () => {
    const tabs = navTabsHostDetails({
      hasMlUserPermissions: false,
      isRiskyHostsEnabled: true,
      hostName: mockHostName,
    });

    Object.values(tabs).forEach((item) => {
      const tab = item as TabNavigationItemProps;

      if (tab.id === HostsTableType.sessions) {
        expect(tab.isBeta).toEqual(true);
      } else {
        expect(tab.isBeta).toEqual(undefined);
      }
    });
  });
});
