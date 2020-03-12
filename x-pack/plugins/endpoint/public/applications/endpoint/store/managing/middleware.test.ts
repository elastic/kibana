/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart, HttpSetup } from 'kibana/public';
import { applyMiddleware, createStore, Dispatch, Store } from 'redux';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { History, createBrowserHistory } from 'history';
import { managementListReducer, managementMiddlewareFactory } from './index';
import { EndpointMetadata, EndpointResultList } from '../../../../../common/types';
import { ManagementListState } from '../../types';
import { AppAction } from '../action';
import { listData } from './selectors';
describe('endpoint list saga', () => {
  const sleep = (ms = 100) => new Promise(wakeup => setTimeout(wakeup, ms));
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let store: Store<ManagementListState>;
  let getState: typeof store['getState'];
  let dispatch: Dispatch<AppAction>;
  let history: History<never>;

  // https://github.com/elastic/endpoint-app-team/issues/131
  const generateEndpoint = (): EndpointMetadata => {
    return {
      '@timestamp': new Date(1582231151055).toString(),
      event: {
        created: new Date(0),
      },
      endpoint: {
        policy: {
          id: '',
        },
      },
      agent: {
        version: '',
        id: '',
      },
      host: {
        id: '',
        hostname: '',
        ip: [''],
        mac: [''],
        os: {
          name: '',
          full: '',
          version: '',
          variant: '',
        },
      },
    };
  };
  const getEndpointListApiResponse = (): EndpointResultList => {
    return {
      endpoints: [generateEndpoint()],
      request_page_size: 1,
      request_page_index: 1,
      total: 10,
    };
  };
  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
    store = createStore(
      managementListReducer,
      applyMiddleware(managementMiddlewareFactory(fakeCoreStart))
    );
    getState = store.getState;
    dispatch = store.dispatch;
    history = createBrowserHistory();
  });
  test('it handles `userChangedUrl`', async () => {
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.post.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.post).not.toHaveBeenCalled();

    dispatch({
      type: 'userChangedUrl',
      payload: {
        ...history.location,
        pathname: '/management',
      },
    });
    await sleep();
    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/metadata', {
      body: JSON.stringify({
        paging_properties: [{ page_index: 0 }, { page_size: 10 }],
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.endpoints);
  });
});
