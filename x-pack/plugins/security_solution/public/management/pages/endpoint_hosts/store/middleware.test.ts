/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart, HttpSetup } from 'kibana/public';
import { applyMiddleware, createStore, Store } from 'redux';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { History, createBrowserHistory } from 'history';

import { DepsStartMock, depsStartMock } from '../../../../common/mock/endpoint';

import {
  createSpyMiddleware,
  MiddlewareActionSpyHelper,
} from '../../../../common/store/test_utils';
import { Immutable, HostResultList } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import { mockEndpointResultList } from './mock_endpoint_result_list';
import { listData } from './selectors';
import { EndpointState } from '../types';
import { endpointListReducer } from './reducer';
import { endpointMiddlewareFactory } from './middleware';
import { getEndpointListPath, getPolicyDetailPath } from '../../../common/routing';

jest.mock('../../policy/store/policy_list/services/ingest', () => ({
  sendGetEndpointSecurityPackage: () => Promise.resolve({}),
  sendGetAgentConfigList: () => Promise.resolve({ items: [] }),
}));

jest.mock('../../../common/polling', () => {
  const { startPoll } = jest.requireActual('../../../common/polling');
  return {
    startPoll,
    POLL_INTERVAL: 10,
  };
});

describe('endpoint list middleware', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  type EndpointListStore = Store<Immutable<EndpointState>, Immutable<AppAction>>;
  let store: EndpointListStore;
  let getState: EndpointListStore['getState'];
  let dispatch: EndpointListStore['dispatch'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let actionShouldTimeout: MiddlewareActionSpyHelper['actionShouldTimeout'];
  let actionSpyMiddleware;

  let history: History<never>;
  const getEndpointListApiResponse = (): HostResultList => {
    return mockEndpointResultList({ request_page_size: 1, request_page_index: 1, total: 10 });
  };
  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
    ({ actionSpyMiddleware, waitForAction, actionShouldTimeout } = createSpyMiddleware<
      EndpointState
    >());
    store = createStore(
      endpointListReducer,
      applyMiddleware(endpointMiddlewareFactory(fakeCoreStart, depsStart), actionSpyMiddleware)
    );
    getState = store.getState;
    dispatch = store.dispatch;
    history = createBrowserHistory();
  });
  it('handles `userChangedUrl`', async () => {
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.post.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.post).not.toHaveBeenCalled();

    dispatch({
      type: 'userChangedUrl',
      payload: {
        ...history.location,
        pathname: getEndpointListPath({ name: 'endpointList' }),
      },
    });
    await waitForAction('serverReturnedEndpointList');
    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/metadata', {
      body: JSON.stringify({
        paging_properties: [{ page_index: '0' }, { page_size: '10' }],
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.hosts);
  });

  it('handles `appRequestedEndpointList` and poll', async () => {
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.post.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.post).not.toHaveBeenCalled();

    // First change the URL
    dispatch({
      type: 'userChangedUrl',
      payload: {
        ...history.location,
        pathname: getEndpointListPath({ name: 'endpointList' }),
      },
    });
    await waitForAction('serverReturnedEndpointList');

    // Then request the Endpoint List
    dispatch({
      type: 'appRequestedEndpointList',
    });
    await waitForAction('serverReturnedEndpointList');
    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/metadata', {
      body: JSON.stringify({
        paging_properties: [{ page_index: '0' }, { page_size: '10' }],
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.hosts);

    // Wait for the poll
    await waitForAction('appRequestedEndpointList');
    await waitForAction('serverReturnedEndpointList');
    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/metadata', {
      body: JSON.stringify({
        paging_properties: [{ page_index: '0' }, { page_size: '10' }],
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.hosts);

    // Navigate away
    dispatch({
      type: 'userChangedUrl',
      payload: {
        ...history.location,
        pathname: getPolicyDetailPath('123'),
      },
    });

    // Poll should toggle off
    const action = await waitForAction('serverToggledEndpointListAutoRefresh');
    expect(action.payload).toEqual(false);

    // This action should timeout since polling is off
    await actionShouldTimeout('appRequestedEndpointList');
    expect(fakeHttpServices.post).toBeCalledTimes(3);
  });
});
