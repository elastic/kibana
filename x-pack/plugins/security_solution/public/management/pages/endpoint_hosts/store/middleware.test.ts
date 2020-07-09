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
import { mockHostResultList } from './mock_host_result_list';
import { listData } from './selectors';
import { HostState } from '../types';
import { hostListReducer } from './reducer';
import { hostMiddlewareFactory } from './middleware';
import { getHostListPath } from '../../../common/routing';

describe('host list middleware', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  type HostListStore = Store<Immutable<HostState>, Immutable<AppAction>>;
  let store: HostListStore;
  let getState: HostListStore['getState'];
  let dispatch: HostListStore['dispatch'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let actionSpyMiddleware;

  let history: History<never>;
  const getEndpointListApiResponse = (): HostResultList => {
    return mockHostResultList({ request_page_size: 1, request_page_index: 1, total: 10 });
  };
  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
    ({ actionSpyMiddleware, waitForAction } = createSpyMiddleware<HostState>());
    store = createStore(
      hostListReducer,
      applyMiddleware(hostMiddlewareFactory(fakeCoreStart, depsStart), actionSpyMiddleware)
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
        pathname: getHostListPath({ name: 'hostList' }),
      },
    });
    await waitForAction('serverReturnedHostList');
    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/metadata', {
      body: JSON.stringify({
        paging_properties: [{ page_index: '0' }, { page_size: '10' }],
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.hosts);
  });
});
