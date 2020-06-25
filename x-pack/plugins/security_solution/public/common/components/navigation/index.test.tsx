/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { CONSTANTS } from '../url_state/constants';
import { SiemNavigationComponent } from './';
import { setBreadcrumbs } from './breadcrumbs';
import { navTabs } from '../../../app/home/home_navigations';
import { HostsTableType } from '../../../hosts/store/model';
import { RouteSpyState } from '../../utils/route/types';
import { SiemNavigationProps, SiemNavigationComponentProps } from './types';

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

describe('SIEM Navigation', () => {
  const mockProps: SiemNavigationComponentProps & SiemNavigationProps & RouteSpyState = {
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
            from: 1558048243696,
            fromStr: 'now-24h',
            kind: 'relative',
            to: 1558134643697,
            toStr: 'now',
          },
          linkTo: ['timeline'],
        },
        timeline: {
          [CONSTANTS.timerange]: {
            from: 1558048243696,
            fromStr: 'now-24h',
            kind: 'relative',
            to: 1558134643697,
            toStr: 'now',
          },
          linkTo: ['global'],
        },
      },
      [CONSTANTS.appQuery]: { query: '', language: 'kuery' },
      [CONSTANTS.filters]: [],
      [CONSTANTS.timeline]: {
        id: '',
        isOpen: false,
      },
    },
  };
  const wrapper = mount(<SiemNavigationComponent {...mockProps} />);
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
          management: {
            disabled: false,
            href: '/app/security/management',
            id: 'management',
            name: 'Management',
            urlKey: 'management',
          },
          hosts: {
            disabled: false,
            href: '/app/security/hosts',
            id: 'hosts',
            name: 'Hosts',
            urlKey: 'host',
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
          endpointAlerts: {
            disabled: false,
            href: '/app/security/endpoint-alerts',
            id: 'endpointAlerts',
            name: 'Endpoint Alerts',
            urlKey: 'management',
          },
        },
        pageName: 'hosts',
        pathName: '/',
        search: '',
        state: undefined,
        tabName: 'authentications',
        query: { query: '', language: 'kuery' },
        filters: [],
        flowTarget: undefined,
        savedQuery: undefined,
        timeline: {
          id: '',
          isOpen: false,
        },
        timerange: {
          global: {
            linkTo: ['timeline'],
            timerange: {
              from: 1558048243696,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1558134643697,
              toStr: 'now',
            },
          },
          timeline: {
            linkTo: ['global'],
            timerange: {
              from: 1558048243696,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1558134643697,
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
          endpointAlerts: {
            disabled: false,
            href: '/app/security/endpoint-alerts',
            id: 'endpointAlerts',
            name: 'Endpoint Alerts',
            urlKey: 'management',
          },
          hosts: {
            disabled: false,
            href: '/app/security/hosts',
            id: 'hosts',
            name: 'Hosts',
            urlKey: 'host',
          },
          management: {
            disabled: false,
            href: '/app/security/management',
            id: 'management',
            name: 'Management',
            urlKey: 'management',
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
        state: undefined,
        tabName: 'authentications',
        timeline: { id: '', isOpen: false },
        timerange: {
          global: {
            linkTo: ['timeline'],
            timerange: {
              from: 1558048243696,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1558134643697,
              toStr: 'now',
            },
          },
          timeline: {
            linkTo: ['global'],
            timerange: {
              from: 1558048243696,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1558134643697,
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
