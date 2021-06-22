/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { CONSTANTS } from '../url_state/constants';
import { TabNavigationComponent } from './';
import { setBreadcrumbs } from './breadcrumbs';
import { navTabs } from '../../../app/home/home_navigations';
import { HostsTableType } from '../../../hosts/store/model';
import { RouteSpyState } from '../../utils/route/types';
import { TabNavigationComponentProps, SecuritySolutionTabNavigationProps } from './types';
import { TimelineTabs } from '../../../../common/types/timeline';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('./breadcrumbs', () => ({
  setBreadcrumbs: jest.fn(),
}));
const mockGetUrlForApp = jest.fn();
jest.mock('../../lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        chrome: undefined,
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: mockGetUrlForApp,
        },
      },
    }),
  };
});
jest.mock('../link_to');

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(() => ({
    search: '',
  })),
  useHistory: jest.fn(),
}));

describe('SIEM Navigation', () => {
  const mockProps: TabNavigationComponentProps &
    SecuritySolutionTabNavigationProps &
    RouteSpyState = {
    pageName: 'hosts',
    pathName: '/',
    detailName: undefined,
    search: '',
    tabName: HostsTableType.authentications,
    navTabs,
    urlState: {
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
      [CONSTANTS.appQuery]: { query: '', language: 'kuery' },
      [CONSTANTS.filters]: [],
      [CONSTANTS.sourcerer]: {},
      [CONSTANTS.timeline]: {
        activeTab: TimelineTabs.query,
        id: '',
        isOpen: false,
        graphEventId: '',
      },
    },
  };
  const wrapper = mount(<TabNavigationComponent {...mockProps} />);
  test('it calls setBreadcrumbs with correct path on mount', () => {
    expect(setBreadcrumbs).toHaveBeenNthCalledWith(
      1,
      {
        detailName: undefined,
        navTabs: {
          alerts: {
            disabled: false,
            href: '/app/security/alerts',
            id: 'alerts',
            name: 'Alerts',
            urlKey: 'alerts',
          },
          case: {
            disabled: false,
            href: '/app/security/cases',
            id: 'case',
            name: 'Cases',
            urlKey: 'case',
          },
          exceptions: {
            disabled: false,
            href: '/app/security/exceptions',
            id: 'exceptions',
            name: 'Exceptions',
            urlKey: 'exceptions',
          },
          administration: {
            disabled: false,
            href: '/app/security/administration',
            id: 'administration',
            name: 'Administration',
            urlKey: 'administration',
          },
          hosts: {
            disabled: false,
            href: '/app/security/hosts',
            id: 'hosts',
            name: 'Hosts',
            urlKey: 'host',
          },
          rules: {
            disabled: false,
            href: '/app/security/rules',
            id: 'rules',
            name: 'Rules',
            urlKey: 'rules',
          },
          network: {
            disabled: false,
            href: '/app/security/network',
            id: 'network',
            name: 'Network',
            urlKey: 'network',
          },
          overview: {
            disabled: false,
            href: '/app/security/overview',
            id: 'overview',
            name: 'Overview',
            urlKey: 'overview',
          },
          timelines: {
            disabled: false,
            href: '/app/security/timelines',
            id: 'timelines',
            name: 'Timelines',
            urlKey: 'timeline',
          },
        },
        pageName: 'hosts',
        pathName: '/',
        search: '',
        sourcerer: {},
        state: undefined,
        tabName: 'authentications',
        query: { query: '', language: 'kuery' },
        filters: [],
        flowTarget: undefined,
        savedQuery: undefined,
        timeline: {
          activeTab: TimelineTabs.query,
          id: '',
          isOpen: false,
          graphEventId: '',
        },
        timerange: {
          global: {
            linkTo: ['timeline'],
            timerange: {
              from: '2019-05-16T23:10:43.696Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2019-05-17T23:10:43.697Z',
              toStr: 'now',
            },
          },
          timeline: {
            linkTo: ['global'],
            timerange: {
              from: '2019-05-16T23:10:43.696Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2019-05-17T23:10:43.697Z',
              toStr: 'now',
            },
          },
        },
      },
      undefined,
      mockGetUrlForApp
    );
  });
  test('it calls setBreadcrumbs with correct path on update', () => {
    wrapper.setProps({
      pageName: 'network',
      pathName: '/',
      tabName: 'authentications',
    });
    wrapper.update();
    expect(setBreadcrumbs).toHaveBeenNthCalledWith(
      2,
      {
        detailName: undefined,
        filters: [],
        flowTarget: undefined,
        navTabs: {
          alerts: {
            disabled: false,
            href: '/app/security/alerts',
            id: 'alerts',
            name: 'Alerts',
            urlKey: 'alerts',
          },
          case: {
            disabled: false,
            href: '/app/security/cases',
            id: 'case',
            name: 'Cases',
            urlKey: 'case',
          },
          exceptions: {
            disabled: false,
            href: '/app/security/exceptions',
            id: 'exceptions',
            name: 'Exceptions',
            urlKey: 'exceptions',
          },
          hosts: {
            disabled: false,
            href: '/app/security/hosts',
            id: 'hosts',
            name: 'Hosts',
            urlKey: 'host',
          },
          rules: {
            disabled: false,
            href: '/app/security/rules',
            id: 'rules',
            name: 'Rules',
            urlKey: 'rules',
          },
          administration: {
            disabled: false,
            href: '/app/security/administration',
            id: 'administration',
            name: 'Administration',
            urlKey: 'administration',
          },
          network: {
            disabled: false,
            href: '/app/security/network',
            id: 'network',
            name: 'Network',
            urlKey: 'network',
          },
          overview: {
            disabled: false,
            href: '/app/security/overview',
            id: 'overview',
            name: 'Overview',
            urlKey: 'overview',
          },
          timelines: {
            disabled: false,
            href: '/app/security/timelines',
            id: 'timelines',
            name: 'Timelines',
            urlKey: 'timeline',
          },
        },
        pageName: 'network',
        pathName: '/',
        query: { language: 'kuery', query: '' },
        savedQuery: undefined,
        search: '',
        sourcerer: {},
        state: undefined,
        tabName: 'authentications',
        timeline: { id: '', isOpen: false, activeTab: TimelineTabs.query, graphEventId: '' },
        timerange: {
          global: {
            linkTo: ['timeline'],
            timerange: {
              from: '2019-05-16T23:10:43.696Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2019-05-17T23:10:43.697Z',
              toStr: 'now',
            },
          },
          timeline: {
            linkTo: ['global'],
            timerange: {
              from: '2019-05-16T23:10:43.696Z',
              fromStr: 'now-24h',
              kind: 'relative',
              to: '2019-05-17T23:10:43.697Z',
              toStr: 'now',
            },
          },
        },
      },
      undefined,
      mockGetUrlForApp
    );
  });
});
