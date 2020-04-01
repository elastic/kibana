/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart, HttpSetup } from 'kibana/public';
import { applyMiddleware, createStore, Dispatch, Store } from 'redux';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { History, createBrowserHistory } from 'history';
import { hostListReducer, hostMiddlewareFactory } from './index';
import { HostResultList } from '../../../../../common/types';
import { HostListState } from '../../types';
import { AppAction } from '../action';
import { listData } from './selectors';
import { DepsStartMock, depsStartMock } from '../../mocks';
import { mockHostResultList } from './mock_host_result_list';

describe('host list middleware', () => {
  const sleep = (ms = 100) => new Promise(wakeup => setTimeout(wakeup, ms));
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let store: Store<HostListState>;
  let getState: typeof store['getState'];
  let dispatch: Dispatch<AppAction>;

  let history: History<never>;
  const getEndpointListApiResponse = (): HostResultList => {
    return mockHostResultList({ request_page_size: 1, request_page_index: 1, total: 10 });
  };
  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
    store = createStore(
      hostListReducer,
      applyMiddleware(hostMiddlewareFactory(fakeCoreStart, depsStart))
    );
    getState = store.getState;
    dispatch = store.dispatch;
    history = createBrowserHistory();
  });
  test('handles `userChangedUrl`', async () => {
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.post.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.post).not.toHaveBeenCalled();

    dispatch({
      type: 'userChangedUrl',
      payload: {
        ...history.location,
        pathname: '/hosts',
      },
    });
    await sleep();
    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/metadata', {
      body: JSON.stringify({
        paging_properties: [{ page_index: 0 }, { page_size: 10 }],
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.hosts);
  });
});
