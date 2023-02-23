/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Router } from 'react-router-dom';

import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock';
import { TabNavigationWithBreadcrumbs } from '../../../common/components/navigation/tab_navigation_with_breadcrumbs';
import { Users } from './users';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { LandingPageComponent } from '../../../common/components/landing_page';

jest.mock('../../../common/containers/sourcerer');
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../../common/components/visualization_actions/actions');
const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          ...original.useKibana().services.application,
          navigateToApp: mockNavigateToApp,
        },
        cases: {
          ui: {
            getCasesContext: jest.fn().mockReturnValue(mockCasesContext),
          },
        },
      },
    }),
  };
});
type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};
const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
describe('Users - rendering', () => {
  test('it renders getting started page when no index is available', async () => {
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: false,
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Users />
        </Router>
      </TestProviders>
    );

    expect(wrapper.find(LandingPageComponent).exists()).toBe(true);
  });

  test('it should render tab navigation', async () => {
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Users />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find(TabNavigationWithBreadcrumbs).exists()).toBe(true);
  });
});
