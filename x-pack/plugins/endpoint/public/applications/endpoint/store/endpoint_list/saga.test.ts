/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart, HttpSetup } from 'kibana/public';
import { applyMiddleware, combineReducers, createStore, Dispatch, Store } from 'redux';
import { createSagaMiddleware, SagaContext } from '../../lib';
import { endpointListSaga } from './saga';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { endpointListReducer } from './index';
import { EndpointMetadata, EndpointResultList } from '../../../../../common/types';
import { ManagementState } from '../../types';
import { AppAction } from '../action';
import { endpointListData } from './selectors';
describe('endpoint list saga', () => {
  const sleep = (ms = 100) => new Promise(wakeup => setTimeout(wakeup, ms));
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let store: Store<{ endpointList: ManagementState }>;
  let dispatch: Dispatch<AppAction>;
  let stopSagas: () => void;
  const globalStoreReducer = combineReducers({
    endpointList: endpointListReducer,
  });
  // TODO: consolidate the below ++ helpers in `index.test.ts` into a `test_helpers.ts`??
  const generateEndpoint = (): EndpointMetadata => {
    return {
      event: {
        created: new Date(),
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
    store = createStore(globalStoreReducer, applyMiddleware(sagaMiddleware));
    sagaMiddleware.start();
    stopSagas = sagaMiddleware.stop;
    dispatch = store.dispatch;
  });
  afterEach(() => {
    stopSagas();
  });
  test('it handles `userNavigatedToPage`', async () => {
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.post.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.post).not.toHaveBeenCalled();
    dispatch({ type: 'userNavigatedToPage', payload: 'managementPage' });
    await sleep();
    expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/endpoint/endpoints', {
      body: JSON.stringify({
        paging_properties: [{ page_index: 0 }, { page_size: 10 }],
      }),
    });
    expect(endpointListData(store.getState().endpointList)).toEqual(apiResponse.endpoints);
  });
});
