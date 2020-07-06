/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Router } from 'react-router-dom';
import { ActionCreator } from 'typescript-fsa';

import '../../../common/mock/match_media';

import { useWithSource } from '../../../common/containers/source';
import { FlowTarget } from '../../../graphql/types';
import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { createStore, State } from '../../../common/store';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { IPDetailsComponent, IPDetails } from './index';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

type GlobalWithFetch = NodeJS.Global & { fetch: jest.Mock };

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/containers/source');
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest
    .fn()
    .mockReturnValue({ from: 0, isInitializing: false, to: 0, setQuery: jest.fn() }),
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

const to = new Date('2018-03-23T18:49:23.132Z').valueOf();
const from = new Date('2018-03-24T03:33:52.253Z').valueOf();
const getMockProps = (ip: string) => ({
  to,
  from,
  isInitializing: false,
  setQuery: jest.fn(),
  query: { query: 'coolQueryhuh?', language: 'keury' },
  filters: [],
  flowTarget: FlowTarget.source,
  history: getMockHistory(ip),
  location: {
    pathname: `/network/ip/${ip}`,
    search: '',
    state: '',
    hash: '',
  },
  detailName: ip,
  match: { params: { detailName: ip, search: '' }, isExact: true, path: '', url: '' },
  setAbsoluteRangeDatePicker: (jest.fn() as unknown) as ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>,
  setIpDetailsTablesActivePageToZero: (jest.fn() as unknown) as ActionCreator<void>,
});

describe('Ip Details', () => {
  const mount = useMountAppended();
  beforeAll(() => {
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: false,
      indexPattern: {},
    });
    (global as GlobalWithFetch).fetch = jest.fn().mockImplementationOnce(() =>
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
  });

  test('it renders', () => {
    const wrapper = shallow(<IPDetailsComponent {...getMockProps('123.456.78.90')} />);
    expect(wrapper.find('[data-test-subj="ip-details-page"]').exists()).toBe(true);
  });

  test('it matches the snapshot', () => {
    const wrapper = shallow(<IPDetailsComponent {...getMockProps('123.456.78.90')} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders ipv6 headline', async () => {
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
    const ip = 'fe80--24ce-f7ff-fede-a571';
    const wrapper = mount(
      <TestProviders store={store}>
        <Router history={getMockHistory(ip)}>
          <IPDetails {...getMockProps(ip)} />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="ip-details-headline"] [data-test-subj="header-page-title"]')
        .text()
    ).toEqual('fe80::24ce:f7ff:fede:a571');
  });
});
