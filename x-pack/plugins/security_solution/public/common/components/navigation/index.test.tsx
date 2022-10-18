/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TabNavigationComponent } from '.';
import { navTabs } from '../../../app/home/home_navigations';
import { HostsTableType } from '../../../explore/hosts/store/model';
import type { RouteSpyState } from '../../utils/route/types';
import type { TabNavigationComponentProps, SecuritySolutionTabNavigationProps } from './types';
import { SecurityPageName } from '../../../app/types';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

const mockSetBreadcrumbs = jest.fn();

jest.mock('./breadcrumbs', () => ({
  useSetBreadcrumbs: () => mockSetBreadcrumbs,
}));
const mockGetUrlForApp = jest.fn();
const mockNavigateToUrl = jest.fn();
jest.mock('../../lib/kibana/kibana_react', () => {
  return {
    useKibana: () => ({
      services: {
        chrome: undefined,
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: mockGetUrlForApp,
          navigateToUrl: mockNavigateToUrl,
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
    pageName: SecurityPageName.hosts,
    pathName: '/',
    detailName: undefined,
    search: '',
    tabName: HostsTableType.authentications,
    navTabs,
  };
  const wrapper = mount(<TabNavigationComponent {...mockProps} />);
  test('it calls setBreadcrumbs with correct path on mount', () => {
    expect(mockSetBreadcrumbs).toHaveBeenNthCalledWith(
      1,
      {
        detailName: undefined,
        navTabs,
        pageName: 'hosts',
        pathName: '/',
        search: '',
        state: undefined,
        tabName: 'authentications',
        flowTarget: undefined,
        savedQuery: undefined,
      },
      undefined,
      mockNavigateToUrl
    );
  });
  test('it calls setBreadcrumbs with correct path on update', () => {
    wrapper.setProps({
      pageName: 'network',
      pathName: '/',
      tabName: 'authentications',
    });
    wrapper.update();
    expect(mockSetBreadcrumbs).toHaveBeenNthCalledWith(
      2,
      {
        detailName: undefined,
        flowTarget: undefined,
        navTabs,
        search: '',
        pageName: 'network',
        pathName: '/',
        state: undefined,
        tabName: 'authentications',
      },
      undefined,
      mockNavigateToUrl
    );
  });
});
