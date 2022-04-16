/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TimelineTabs } from '../../../../../common/types/timeline';

import { navTabsHostDetails } from '../../../../hosts/pages/details/nav_tabs';
import { HostsTableType } from '../../../../hosts/store/model';
import { RouteSpyState } from '../../../utils/route/types';
import { CONSTANTS } from '../../url_state/constants';
import { TabNavigationComponent } from '.';
import { TabNavigationProps } from './types';

jest.mock('../../link_to');
jest.mock('../../../lib/kibana/kibana_react', () => {
  const originalModule = jest.requireActual('../../../lib/kibana/kibana_react');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          getUrlForApp: (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path}`,
          navigateToApp: jest.fn(),
        },
      },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
  };
});

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
  const mockRiskyHostEnabled = true;

  const mockProps: TabNavigationProps & RouteSpyState = {
    pageName: 'hosts',
    pathName: '/hosts',
    detailName: undefined,
    search: '',
    tabName: HostsTableType.authentications,
    navTabs: navTabsHostDetails({
      hostName,
      hasMlUserPermissions: mockHasMlUserPermissions,
      isRiskyHostsEnabled: mockRiskyHostEnabled,
    }),

    [CONSTANTS.timerange]: {
      global: {
        [CONSTANTS.timerange]: {
          from: '2019-05-16T23:10:43.696Z',
          fromStr: 'now-24h',
          kind: 'relative',
          to: '2019-05-17T23:10:43.697Z',
          toStr: 'now',
        },
        linkTo: ['timeline'],
      },
      timeline: {
        [CONSTANTS.timerange]: {
          from: '2019-05-16T23:10:43.696Z',
          fromStr: 'now-24h',
          kind: 'relative',
          to: '2019-05-17T23:10:43.697Z',
          toStr: 'now',
        },
        linkTo: ['global'],
      },
    },
    [CONSTANTS.appQuery]: { query: 'host.name:"siem-es"', language: 'kuery' },
    [CONSTANTS.filters]: [],
    [CONSTANTS.sourcerer]: {},
    [CONSTANTS.timeline]: {
      activeTab: TimelineTabs.query,
      id: '',
      isOpen: false,
      graphEventId: '',
    },
  };
  test('it mounts with correct tab highlighted', () => {
    const wrapper = mount(<TabNavigationComponent {...mockProps} />);
    const tableNavigationTab = wrapper.find(
      `EuiTab[data-test-subj="navigation-${HostsTableType.authentications}"]`
    );

    expect(tableNavigationTab.prop('isSelected')).toBeTruthy();
  });
  test('it changes active tab when nav changes by props', () => {
    const wrapper = mount(<TabNavigationComponent {...mockProps} />);
    const tableNavigationTab = () =>
      wrapper.find(`[data-test-subj="navigation-${HostsTableType.events}"]`).first();
    expect(tableNavigationTab().prop('isSelected')).toBeFalsy();
    wrapper.setProps({
      tabName: HostsTableType.events,
    });
    wrapper.update();
    expect(tableNavigationTab().prop('isSelected')).toBeTruthy();
  });
  test('it carries the url state in the link', () => {
    const wrapper = mount(<TabNavigationComponent {...mockProps} />);

    const firstTab = wrapper.find(
      `EuiTab[data-test-subj="navigation-${HostsTableType.authentications}"]`
    );
    expect(firstTab.props().href).toBe(
      `/app/securitySolutionUI/hosts/siem-window/authentications${SEARCH_QUERY}`
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
