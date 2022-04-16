/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Router } from 'react-router-dom';
import { waitFor } from '@testing-library/react';
import '../../common/mock/match_media';
import type { Filter } from '@kbn/es-query';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import {
  TestProviders,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../common/mock';
import { State, createStore } from '../../common/store';
import { inputsActions } from '../../common/store/inputs';

import { Network } from './network';
import { NetworkRoutes } from './navigation';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { LandingPageComponent } from '../../common/components/landing_page';

jest.mock('../../common/containers/sourcerer');

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../common/components/visualization_actions', () => ({
  VisualizationActions: jest.fn(() => <div data-test-subj="mock-viz-actions" />),
}));

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

const to = '2018-03-23T18:49:23.132Z';
const from = '2018-03-24T03:33:52.253Z';

const mockProps = {
  networkPagePath: '',
  to,
  from,
  isInitializing: false,
  setQuery: jest.fn(),
  capabilitiesFetched: true,
  hasMlUserPermissions: true,
};

const mockMapVisibility = jest.fn();
const mockNavigateToApp = jest.fn();
jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          ...original.useKibana().services.application,
          capabilities: {
            siem: { crud_alerts: true, read_alerts: true },
            maps: mockMapVisibility(),
          },
          navigateToApp: mockNavigateToApp,
        },
        storage: {
          get: () => true,
        },
        cases: {
          ...mockCasesContract(),
        },
      },
    }),
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
    }),
  };
});

const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
describe('Network page - rendering', () => {
  beforeAll(() => {
    mockMapVisibility.mockReturnValue({ show: true });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('it renders getting started page when no index is available', () => {
    mockUseSourcererDataView.mockReturnValue({
      selectedPatterns: [],
      indicesExist: false,
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );

    expect(wrapper.find(LandingPageComponent).exists()).toBe(true);
  });

  test('it DOES NOT render getting started page when an index is available', async () => {
    mockUseSourcererDataView.mockReturnValue({
      selectedPatterns: [],
      indicesExist: true,
      indexPattern: {},
    });
    mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });
  });

  test('it renders the network map if user has permissions', () => {
    mockUseSourcererDataView.mockReturnValue({
      selectedPatterns: [],
      indicesExist: true,
      indexPattern: {},
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="conditional-embeddable-map"]').exists()).toBe(true);
  });

  test('it does not render the network map if user does not have permissions', () => {
    mockMapVisibility.mockReturnValue({ show: false });
    mockUseSourcererDataView.mockReturnValue({
      selectedPatterns: [],
      indicesExist: true,
      indexPattern: {},
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="conditional-embeddable-map"]').exists()).toBe(false);
  });

  test('it should add the new filters after init', async () => {
    const newFilters: Filter[] = [
      {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        'host.name': 'ItRocks',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        meta: {
          alias: '',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value:
            '{"query": {"bool": {"filter": [{"bool": {"should": [{"match_phrase": {"host.name": "ItRocks"}}],"minimum_should_match": 1}}]}}}',
        },
      },
    ];
    mockUseSourcererDataView.mockReturnValue({
      selectedPatterns: [],
      indicesExist: true,
      indexPattern: { fields: [], title: 'title' },
    });
    const myState: State = mockGlobalState;
    const { storage } = createSecuritySolutionStorageMock();
    const myStore = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    const wrapper = mount(
      <TestProviders store={myStore}>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.update();

      myStore.dispatch(inputsActions.setSearchBarFilter({ id: 'global', filters: newFilters }));
      wrapper.update();
      expect(wrapper.find(NetworkRoutes).props().filterQuery).toEqual(
        '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"ItRocks"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}'
      );
    });
  });
});
