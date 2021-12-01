/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, useParams } from 'react-router-dom';

import '../../../common/mock/match_media';

import { useSourcererDataView } from '../../../common/containers/sourcerer';
import {
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { createStore, State } from '../../../common/store';
import { NetworkDetails } from './index';
import { FlowTarget } from '../../../../common/search_strategy';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useParams: jest.fn(),
  };
});
jest.mock('../../containers/details', () => ({
  useNetworkDetails: jest.fn().mockReturnValue([true, { networkDetails: {} }]),
}));
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/containers/sourcerer');
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));

const getMockHistory = (ip: string) => ({
  length: 2,
  location: {
    pathname: `/network/ip/${ip}`,
    search: '',
    state: '',
    hash: '',
  },
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
});

describe('Network Details', () => {
  const mount = useMountAppended();
  beforeAll(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: false,
      indexPattern: {},
    });
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => {
          return null;
        },
      })
    );
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  test('it renders', () => {
    const ip = '123.456.78.90';
    (useParams as jest.Mock).mockReturnValue({
      detailName: ip,
      flowTarget: FlowTarget.source,
    });
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={getMockHistory(ip)}>
          <NetworkDetails />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="network-details-page"]').exists()).toBe(true);
  });

  test('it renders ipv6 headline', async () => {
    const ip = 'fe80--24ce-f7ff-fede-a571';
    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
    (useParams as jest.Mock).mockReturnValue({
      detailName: ip,
      flowTarget: FlowTarget.source,
    });
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={getMockHistory(ip)}>
          <NetworkDetails />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="network-details-headline"] h1[data-test-subj="header-page-title"]')
        .text()
    ).toEqual('fe80::24ce:f7ff:fede:a571');
  });
});
