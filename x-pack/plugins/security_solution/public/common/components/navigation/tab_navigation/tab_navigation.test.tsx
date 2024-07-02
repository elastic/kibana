/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { navTabsHostDetails } from '../../../../explore/hosts/pages/details/nav_tabs';
import { HostsTableType } from '../../../../explore/hosts/store/model';
import { TabNavigationComponent } from './tab_navigation';
import type { TabNavigationProps } from './types';
import { mockGetUrlForApp } from '@kbn/security-solution-navigation/mocks/context';

jest.mock('@kbn/security-solution-navigation/src/context');

mockGetUrlForApp.mockImplementation(
  (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path}`
);

const mockUseRouteSpy = jest.fn();
jest.mock('../../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

const SEARCH_QUERY = '?search=test';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn(() => ({
      search: SEARCH_QUERY,
    })),
  };
});

const hostName = 'siem-window';

describe('Table Navigation', () => {
  const mockHasMlUserPermissions = true;
  mockUseRouteSpy.mockReturnValue([{ tabName: HostsTableType.authentications }]);

  const mockProps: TabNavigationProps = {
    navTabs: navTabsHostDetails({
      hostName,
      hasMlUserPermissions: mockHasMlUserPermissions,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it mounts with correct tab highlighted', () => {
    const wrapper = mount(<TabNavigationComponent {...mockProps} />);
    const authNavigationTab = wrapper.find(
      `EuiTab[data-test-subj="navigation-${HostsTableType.authentications}"]`
    );
    expect(authNavigationTab.prop('isSelected')).toBeTruthy();
    const eventsNavigationTab = () =>
      wrapper.find(`[data-test-subj="navigation-${HostsTableType.events}"]`).first();
    expect(eventsNavigationTab().prop('isSelected')).toBeFalsy();
  });

  test('it carries the url state in the link', () => {
    const wrapper = mount(<TabNavigationComponent {...mockProps} />);

    const firstTab = wrapper.find(
      `EuiTab[data-test-subj="navigation-${HostsTableType.authentications}"]`
    );
    expect(firstTab.props().href).toBe(
      `/app/securitySolutionUI/hosts/name/siem-window/authentications${SEARCH_QUERY}`
    );
  });

  test('it renders a EuiBetaBadge only on the sessions tab', () => {
    Object.keys(HostsTableType).forEach((tableType) => {
      if (tableType !== HostsTableType.sessions) {
        const wrapper = mount(<TabNavigationComponent {...mockProps} />);

        const betaBadge = wrapper.find(
          `EuiTab[data-test-subj="navigation-${tableType}"] EuiBetaBadge`
        );

        if (tableType === HostsTableType.sessions) {
          expect(betaBadge).toBeTruthy();
        } else {
          expect(betaBadge).toEqual({});
        }
      }
    });
  });
});
