/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { useRouteSpy } from '../../utils/route/use_route_spy';
import { navTabs } from '../../../app/home/home_navigations';

import type { SecuritySolutionTabNavigationProps } from './types';
import { TabNavigationWithBreadcrumbs } from './tab_navigation_with_breadcrumbs';

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
jest.mock('../../utils/route/use_route_spy');

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(() => ({
    search: '',
  })),
  useHistory: jest.fn(),
}));

describe('SIEM Navigation', () => {
  const mockProps: SecuritySolutionTabNavigationProps = {
    navTabs,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it calls setBreadcrumbs with correct path on mount', () => {
    (useRouteSpy as jest.Mock).mockReturnValueOnce([
      {
        pageName: 'hosts',
        pathName: '/',
        savedQuery: undefined,
        search: '',
        state: undefined,
        tabName: 'authentications',
      },
    ]);

    render(<TabNavigationWithBreadcrumbs {...mockProps} />);

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
    (useRouteSpy as jest.Mock)
      .mockReturnValueOnce([
        {
          pageName: 'hosts',
          pathName: '/',
          savedQuery: undefined,
          search: '',
          state: undefined,
          tabName: 'authentications',
        },
      ])
      .mockReturnValue([
        {
          pageName: 'network',
          pathName: '/',
          savedQuery: undefined,
          search: '',
          state: undefined,
          tabName: 'authentications',
        },
      ]);

    const { rerender } = render(<TabNavigationWithBreadcrumbs {...mockProps} />);

    rerender(<TabNavigationWithBreadcrumbs {...mockProps} />);

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
