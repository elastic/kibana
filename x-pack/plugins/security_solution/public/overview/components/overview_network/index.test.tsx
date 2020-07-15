/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import '../../../common/mock/match_media';
import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  createSecuritySolutionStorageMock,
  kibanaObservable,
} from '../../../common/mock';

import { OverviewNetwork } from '.';
import { createStore, State } from '../../../common/store';
import { overviewNetworkQuery } from '../../containers/overview_network/index.gql_query';
import { GetOverviewHostQuery } from '../../../graphql/types';
import { wait } from '../../../common/lib/helpers';

jest.mock('../../../common/components/link_to');
const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: jest.fn(),
        },
      },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

const startDate = '2020-01-20T20:49:57.080Z';
const endDate = '2020-01-21T20:49:57.080Z';

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
      query: overviewNetworkQuery,
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
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        inspect: false,
      },
    },
    result: {
      data: {
        source: {
          id: 'default',
          OverviewNetwork: {
            auditbeatSocket: 1,
            filebeatCisco: 1,
            filebeatNetflow: 1,
            filebeatPanw: 1,
            filebeatSuricata: 1,
            filebeatZeek: 1,
            packetbeatDNS: 1,
            packetbeatFlow: 1,
            packetbeatTLS: 1,
          },
        },
      },
    },
  },
];

describe('OverviewNetwork', () => {
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
        <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-title"]').first().text()).toEqual(
      'Network events'
    );
  });

  test('it renders an empty subtitle while loading', () => {
    const wrapper = mount(
      <TestProviders>
        <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual('');
  });

  test('it renders the expected event count in the subtitle after loading events', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    wrapper.update();

    expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').first().text()).toEqual(
      'Showing: 9 events'
    );
  });

  it('it renders View Network', () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
        </MockedProvider>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="overview-network-go-to-network-page"]')).toBeTruthy();
  });

  it('when click on View Network we call navigateToApp to make sure to navigate to right page', () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
        </MockedProvider>
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="overview-network-go-to-network-page"] button')
      .simulate('click', {
        preventDefault: jest.fn(),
      });

    expect(mockNavigateToApp).toBeCalledWith('securitySolution:network', { path: '' });
  });
});
