/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../mock';
import { createStore, State } from '../../store';
import { AddFilterToGlobalSearchBar } from '.';

const mockAddFilters = jest.fn();
jest.mock('../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      data: {
        query: {
          filterManager: {
            addFilters: mockAddFilters,
          },
        },
      },
    },
  }),
}));

describe('AddFilterToGlobalSearchBar Component', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
    mockAddFilters.mockClear();
  });

  test('Rendering', async () => {
    const wrapper = shallow(
      <AddFilterToGlobalSearchBar
        filter={{
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.name',
            value: 'siem-kibana',
            params: {
              query: 'siem-kibana',
            },
          },
          query: {
            match: {
              'host.name': {
                query: 'siem-kibana',
                type: 'phrase',
              },
            },
          },
        }}
      >
        <>{'siem-kibana'}</>
      </AddFilterToGlobalSearchBar>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('Rendering tooltip', async () => {
    const wrapper = shallow(
      <TestProviders store={store}>
        <AddFilterToGlobalSearchBar
          filter={{
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              value: 'siem-kibana',
              params: {
                query: 'siem-kibana',
              },
            },
            query: {
              match: {
                'host.name': {
                  query: 'siem-kibana',
                  type: 'phrase',
                },
              },
            },
          }}
        >
          <>{'siem-kibana'}</>
        </AddFilterToGlobalSearchBar>
      </TestProviders>
    );

    wrapper.simulate('mouseenter');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="hover-actions-container"] svg').first()).toBeTruthy();
  });

  test('Functionality with inputs state', async () => {
    const onFilterAdded = jest.fn();

    const wrapper = mount(
      <TestProviders store={store}>
        <AddFilterToGlobalSearchBar
          onFilterAdded={onFilterAdded}
          filter={{
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              value: 'siem-kibana',
              params: {
                query: 'siem-kibana',
              },
            },
            query: {
              match: {
                'host.name': {
                  query: 'siem-kibana',
                  type: 'phrase',
                },
              },
            },
          }}
        >
          <>{'siem-kibana'}</>
        </AddFilterToGlobalSearchBar>
      </TestProviders>
    );

    wrapper
      .simulate('mouseenter')
      .find('[data-test-subj="hover-actions-container"] [data-euiicon-type]')
      .first()
      .simulate('click');
    wrapper.update();

    expect(mockAddFilters.mock.calls[0][0]).toEqual({
      meta: {
        alias: null,
        disabled: false,
        key: 'host.name',
        negate: false,
        params: {
          query: 'siem-kibana',
        },
        type: 'phrase',
        value: 'siem-kibana',
      },
      query: {
        match: {
          'host.name': {
            query: 'siem-kibana',
            type: 'phrase',
          },
        },
      },
    });
    expect(onFilterAdded).toHaveBeenCalledTimes(1);
  });
});
