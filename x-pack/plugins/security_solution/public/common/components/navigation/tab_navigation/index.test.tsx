/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { navTabs } from '../../../../app/home/home_navigations';
import { SecurityPageName } from '../../../../app/types';
import { navTabsHostDetails } from '../../../../hosts/pages/details/nav_tabs';
import { HostsTableType } from '../../../../hosts/store/model';
import { RouteSpyState } from '../../../utils/route/types';
import { CONSTANTS } from '../../url_state/constants';
import { TabNavigationComponent } from './';
import { TabNavigationProps } from './types';

jest.mock('../../../lib/kibana');
jest.mock('../../link_to');

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      push: jest.fn(),
    }),
  };
});

describe('Tab Navigation', () => {
  const pageName = SecurityPageName.hosts;
  const hostName = 'siem-window';
  const tabName = HostsTableType.authentications;
  const pathName = `/${pageName}/${hostName}/${tabName}`;

  describe('Page Navigation', () => {
    const mockProps: TabNavigationProps & RouteSpyState = {
      pageName,
      pathName,
      detailName: undefined,
      search: '',
      tabName,
      navTabs,
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
      [CONSTANTS.timeline]: {
        id: '',
        isOpen: false,
        graphEventId: '',
      },
    };
    test('it mounts with correct tab highlighted', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const hostsTab = wrapper.find('EuiTab[data-test-subj="navigation-hosts"]');
      expect(hostsTab.prop('isSelected')).toBeTruthy();
    });
    test('it changes active tab when nav changes by props', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const networkTab = () => wrapper.find('EuiTab[data-test-subj="navigation-network"]').first();
      expect(networkTab().prop('isSelected')).toBeFalsy();
      wrapper.setProps({
        pageName: 'network',
        pathName: '/network',
        tabName: undefined,
      });
      wrapper.update();
      expect(networkTab().prop('isSelected')).toBeTruthy();
    });
  });

  describe('Table Navigation', () => {
    const mockHasMlUserPermissions = true;
    const mockProps: TabNavigationProps & RouteSpyState = {
      pageName: 'hosts',
      pathName: '/hosts',
      detailName: undefined,
      search: '',
      tabName: HostsTableType.authentications,
      navTabs: navTabsHostDetails(hostName, mockHasMlUserPermissions),
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
      [CONSTANTS.timeline]: {
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
        pageName: SecurityPageName.hosts,
        pathName: `/${SecurityPageName.hosts}`,
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
      expect(firstTab.props().href).toBe('/siem-window/authentications');
    });
  });
});
