/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, HttpSetup } from 'kibana/public';
import { applyMiddleware, createStore, Dispatch, Store } from 'redux';
import { createSagaMiddleware, SagaContext } from '../../lib';
import { endpointListSaga } from './saga';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import {
  EndpointData,
  EndpointListAction,
  EndpointListData,
  endpointListReducer,
  EndpointListState,
} from './index';
import { endpointListData } from './selectors';

describe('endpoint list saga', () => {
  const sleep = (ms = 100) => new Promise(wakeup => setTimeout(wakeup, ms));
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let store: Store<EndpointListState>;
  let dispatch: Dispatch<EndpointListAction>;
  let stopSagas: () => void;

  // TODO: consolidate the below ++ helpers in `index.test.ts` into a `test_helpers.ts`??
  const generateEndpoint = (): EndpointData => {
    return {
      machine_id: Math.random()
        .toString(16)
        .substr(2),
      created_at: new Date(),
      host: {
        name: '',
        hostname: '',
        ip: '',
        mac_address: '',
        os: {
          name: '',
          full: '',
        },
      },
      endpoint: {
        domain: '',
        is_base_image: true,
        active_directory_distinguished_name: '',
        active_directory_hostname: '',
        upgrade: {
          status: '',
          updated_at: new Date(),
        },
        isolation: {
          status: false,
          request_status: true,
          updated_at: new Date(),
        },
        policy: {
          name: '',
          id: '',
        },
        sensor: {
          persistence: true,
          status: {},
        },
      },
    };
  };
  const getEndpointListApiResponse = (): EndpointListData => {
    return {
      endpoints: [generateEndpoint()],
      request_page_size: 1,
      request_page_index: 1,
      total: 10,
    };
  };

  const endpointListSagaFactory = () => {
    return async (sagaContext: SagaContext) => {
      await endpointListSaga(sagaContext, fakeCoreStart).catch((e: Error) => {
        // eslint-disable-next-line no-console
        console.error(e);
        return Promise.reject(e);
      });
    };
  };

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;

    const sagaMiddleware = createSagaMiddleware(endpointListSagaFactory());
    store = createStore(endpointListReducer, applyMiddleware(sagaMiddleware));

    sagaMiddleware.start();
    stopSagas = sagaMiddleware.stop;
    dispatch = store.dispatch;
  });

  afterEach(() => {
    stopSagas();
  });

  test('it handles `userEnteredEndpointListPage`', async () => {
    const apiResponse = getEndpointListApiResponse();

    fakeHttpServices.post.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.post).not.toHaveBeenCalled();

    dispatch({ type: 'userEnteredEndpointListPage' });
    await sleep();

    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/endpoints');
    expect(endpointListData(store.getState())).toEqual(apiResponse.endpoints);
  });
});
