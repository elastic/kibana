/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';

import { OverviewHost } from '.';
import { createStore, State } from '../../../common/store';
import { overviewHostQuery } from '../../containers/overview_host/index.gql_query';
import { GetOverviewHostQuery } from '../../../graphql/types';

import { wait } from '../../../common/lib/helpers';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/link_to');

const startDate = 1579553397080;
const endDate = 1579639797080;

interface MockedProvidedQuery {
  request: {
    query: GetOverviewHostQuery.Query;
    fetchPolicy: string;
    variables: GetOverviewHostQuery.Variables;
  };
  result: {
    data: {
      source: unknown;
    };
  };
}

const mockOpenTimelineQueryResults: MockedProvidedQuery[] = [
  {
    request: {
      query: overviewHostQuery,
      fetchPolicy: 'cache-and-network',
      variables: {
        sourceId: 'default',
        timerange: { interval: '12h', from: startDate, to: endDate },
        filterQuery: undefined,
        defaultIndex: [
          'apm-*-transaction*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'packetbeat-*',
          'winlogbeat-*',
          'logs-*',
        ],
        inspect: false,
      },
    },
    result: {
      data: {
        source: {
          id: 'default',
          OverviewHost: {
            auditbeatAuditd: 1,
            auditbeatFIM: 1,
            auditbeatLogin: 1,
            auditbeatPackage: 1,
            auditbeatProcess: 1,
            auditbeatUser: 1,
            endgameDns: 1,
            endgameFile: 1,
            endgameImageLoad: 1,
            endgameNetwork: 1,
            endgameProcess: 1,
            endgameRegistry: 1,
            endgameSecurity: 1,
            filebeatSystemModule: 1,
            winlogbeatSecurity: 1,
            winlogbeatMWSysmonOperational: 1,
          },
        },
      },
    },
  },
];

describe('OverviewHost', () => {
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
    const myState = cloneDeep(state);
    store = createStore(
      myState,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
  });

  test('it renders the expected widget title', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewHost endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-title"]').first().text()).toEqual(
      'Host events'
    );
  });

  test('it renders an empty subtitle while loading', () => {
    const wrapper = mount(
      <TestProviders>
        <OverviewHost endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual('');
  });

  test('it renders the expected event count in the subtitle after loading events', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OverviewHost endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    wrapper.update();

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual(
      'Showing: 16 events'
    );
  });
});
