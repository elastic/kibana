/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Router } from 'react-router-dom';

import { Filter } from '../../../../../../src/plugins/data/common/es_query';
import '../../common/mock/match_media';
import { useWithSource } from '../../common/containers/source';
import {
  apolloClientObservable,
  TestProviders,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../common/mock';
import { SiemNavigation } from '../../common/components/navigation';
import { inputsActions } from '../../common/store/inputs';
import { State, createStore } from '../../common/store';
import { HostsComponentProps } from './types';
import { Hosts } from './hosts';
import { HostsTabs } from './hosts_tabs';

jest.mock('../../common/containers/source');

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../common/components/query_bar', () => ({
  QueryBar: () => null,
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

describe('Hosts - rendering', () => {
  const hostProps: HostsComponentProps = {
    hostsPagePath: '',
  };

  test('it renders the Setup Instructions text when no index is available', async () => {
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: false,
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Hosts {...hostProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(true);
  });

  test('it DOES NOT render the Setup Instructions text when an index is available', async () => {
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Hosts {...hostProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(false);
  });

  test('it should render tab navigation', async () => {
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Hosts {...hostProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find(SiemNavigation).exists()).toBe(true);
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
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: { fields: [], title: 'title' },
    });
    const myState: State = mockGlobalState;
    const { storage } = createSecuritySolutionStorageMock();
    const myStore = createStore(
      myState,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
    const wrapper = mount(
      <TestProviders store={myStore}>
        <Router history={mockHistory}>
          <Hosts {...hostProps} />
        </Router>
      </TestProviders>
    );
    wrapper.update();
    myStore.dispatch(inputsActions.setSearchBarFilter({ id: 'global', filters: newFilters }));
    wrapper.update();
    expect(wrapper.find(HostsTabs).props().filterQuery).toEqual(
      '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"ItRocks"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}'
    );
  });
});
