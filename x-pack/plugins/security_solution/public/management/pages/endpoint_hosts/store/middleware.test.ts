/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, HttpSetup } from '@kbn/core/public';
import type { Store } from 'redux';
import { applyMiddleware, createStore } from 'redux';
import { coreMock } from '@kbn/core/public/mocks';
import type { History } from 'history';
import { createBrowserHistory } from 'history';
import type { DepsStartMock } from '../../../../common/mock/endpoint';
import { depsStartMock } from '../../../../common/mock/endpoint';
import type { MiddlewareActionSpyHelper } from '../../../../common/store/test_utils';
import { createSpyMiddleware } from '../../../../common/store/test_utils';
import type {
  HostIsolationResponse,
  Immutable,
  ISOLATION_ACTIONS,
  MetadataListResponse,
} from '../../../../../common/endpoint/types';
import type { AppAction } from '../../../../common/store/actions';
import { mockEndpointResultList } from './mock_endpoint_result_list';
import { listData } from './selectors';
import type { EndpointState, TransformStats } from '../types';
import { endpointListReducer } from './reducer';
import { endpointMiddlewareFactory } from './middleware';
import { getEndpointListPath } from '../../../common/routing';
import type { FailedResourceState, LoadedResourceState } from '../../../state';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../state';
import { KibanaServices } from '../../../../common/lib/kibana';
import {
  hostIsolationHttpMocks,
  hostIsolationRequestBodyMock,
  hostIsolationResponseMock,
} from '../../../../common/lib/endpoint_isolation/mocks';
import { endpointPageHttpMock, failedTransformStateMock } from '../mocks';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';

jest.mock('../../../services/policies/ingest', () => ({
  sendGetAgentConfigList: () => Promise.resolve({ items: [] }),
  sendGetAgentPolicyList: () => Promise.resolve({ items: [] }),
  sendBulkGetPackagePolicies: () => Promise.resolve({ items: [] }),
  sendGetEndpointSecurityPackage: () => Promise.resolve({ version: '1.1.1' }),
}));

jest.mock('../../../../common/lib/kibana');
const mockFirstValueFrom = jest.fn();
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  firstValueFrom: () => mockFirstValueFrom(),
}));

type EndpointListStore = Store<Immutable<EndpointState>, Immutable<AppAction>>;

describe('endpoint list middleware', () => {
  const getKibanaServicesMock = KibanaServices.get as jest.Mock;
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let store: EndpointListStore;
  let getState: EndpointListStore['getState'];
  let dispatch: EndpointListStore['dispatch'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let actionSpyMiddleware;
  let history: History<never>;

  const getEndpointListApiResponse = (): MetadataListResponse => {
    return mockEndpointResultList({ pageSize: 1, page: 0, total: 10 });
  };

  const dispatchUserChangedUrlToEndpointList = (locationOverrides: Partial<Location> = {}) => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        ...history.location,
        pathname: getEndpointListPath({ name: 'endpointList' }),
        ...locationOverrides,
      },
    });
  };

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
    ({ actionSpyMiddleware, waitForAction } = createSpyMiddleware<EndpointState>());
    store = createStore(
      endpointListReducer,
      applyMiddleware(endpointMiddlewareFactory(fakeCoreStart, depsStart), actionSpyMiddleware)
    );
    getState = store.getState;
    dispatch = store.dispatch;
    history = createBrowserHistory();
    getKibanaServicesMock.mockReturnValue(fakeCoreStart);
  });

  it('handles `userChangedUrl`', async () => {
    endpointPageHttpMock(fakeHttpServices);
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.get.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.get).not.toHaveBeenCalled();

    dispatchUserChangedUrlToEndpointList();
    await waitForAction('serverReturnedEndpointList');
    expect(fakeHttpServices.get).toHaveBeenNthCalledWith(1, HOST_METADATA_LIST_ROUTE, {
      query: {
        page: '0',
        pageSize: '10',
        kuery: '',
      },
      version: '2023-10-31',
    });
    expect(listData(getState())).toEqual(apiResponse.data);
  });

  it('handles `appRequestedEndpointList`', async () => {
    mockFirstValueFrom.mockResolvedValue({ indexFields: [] });
    endpointPageHttpMock(fakeHttpServices);
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.get.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.get).not.toHaveBeenCalled();

    // First change the URL
    dispatchUserChangedUrlToEndpointList();
    await waitForAction('serverReturnedEndpointList');

    // Then request the Endpoint List
    dispatch({
      type: 'appRequestedEndpointList',
    });

    await Promise.all([
      waitForAction('serverReturnedEndpointList'),
      waitForAction('endpointPendingActionsStateChanged'),
      waitForAction('serverReturnedMetadataPatterns'),
      waitForAction('serverCancelledPolicyItemsLoading'),
      waitForAction('serverReturnedEndpointExistValue'),
    ]);

    expect(fakeHttpServices.get).toHaveBeenNthCalledWith(1, HOST_METADATA_LIST_ROUTE, {
      query: {
        page: '0',
        pageSize: '10',
        kuery: '',
      },
      version: '2023-10-31',
    });
    expect(listData(getState())).toEqual(apiResponse.data);
  });

  describe('handling of IsolateEndpointHost action', () => {
    const dispatchIsolateEndpointHost = (action: ISOLATION_ACTIONS = 'isolate') => {
      dispatch({
        type: 'endpointIsolationRequest',
        payload: {
          type: action,
          data: hostIsolationRequestBodyMock(),
        },
      });
    };
    let isolateApiResponseHandlers: ReturnType<typeof hostIsolationHttpMocks>;

    beforeEach(() => {
      isolateApiResponseHandlers = hostIsolationHttpMocks(fakeHttpServices);
    });

    it('should set Isolation state to loading', async () => {
      const loadingDispatched = waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadingResourceState(action.payload);
        },
      });

      dispatchIsolateEndpointHost();
      expect(await loadingDispatched).not.toBeFalsy();
    });

    it('should call isolate api', async () => {
      dispatchIsolateEndpointHost();
      await waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      expect(isolateApiResponseHandlers.responseProvider.isolateHost).toHaveBeenCalled();
    });

    it('should call unisolate api', async () => {
      dispatchIsolateEndpointHost('unisolate');
      await waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      expect(isolateApiResponseHandlers.responseProvider.unIsolateHost).toHaveBeenCalled();
    });

    it('should set Isolation state to loaded if api is successful', async () => {
      const loadedDispatched = waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      dispatchIsolateEndpointHost();
      expect(
        ((await loadedDispatched).payload as LoadedResourceState<HostIsolationResponse>).data
      ).toEqual(hostIsolationResponseMock());
    });

    it('should set Isolation to Failed if api failed', async () => {
      const apiError = new Error('oh oh');
      const failedDispatched = waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isFailedResourceState(action.payload);
        },
      });

      isolateApiResponseHandlers.responseProvider.isolateHost.mockImplementation(() => {
        throw apiError;
      });
      dispatchIsolateEndpointHost();

      const failedAction = (await failedDispatched)
        .payload as FailedResourceState<HostIsolationResponse>;
      expect(failedAction.error).toBe(apiError);
    });
  });

  describe('handle Endpoint Pending Actions state actions', () => {
    let mockedApis: ReturnType<typeof endpointPageHttpMock>;

    beforeEach(() => {
      mockedApis = endpointPageHttpMock(fakeHttpServices);
    });

    it('should include all agents ids from the list when calling API', async () => {
      const loadingPendingActions = waitForAction('endpointPendingActionsStateChanged', {
        validate: (action) => isLoadedResourceState(action.payload),
      });

      dispatchUserChangedUrlToEndpointList();
      await loadingPendingActions;

      expect(mockedApis.responseProvider.pendingActions).toHaveBeenCalledWith({
        path: expect.any(String),
        version: '2023-10-31',
        query: {
          agent_ids: [
            '0dc3661d-6e67-46b0-af39-6f12b025fcb0',
            'fe16dda9-7f34-434c-9824-b4844880f410',
            'f412728b-929c-48d5-bdb6-5a1298e3e607',
            'd0405ddc-1e7c-48f0-93d7-d55f954bd745',
            '46d78dd2-aedf-4d3f-b3a9-da445f1fd25f',
            '5aafa558-26b8-4bb4-80e2-ac0644d77a3f',
            'edac2c58-1748-40c3-853c-8fab48c333d7',
            '06b7223a-bb2a-428a-9021-f1c0d2267ada',
            'b8daa43b-7f73-4684-9221-dbc8b769405e',
            'fbc06310-7d41-46b8-a5ea-ceed8a993b1a',
          ],
        },
      });
    });
  });

  describe('handles metadata transform stats actions', () => {
    const dispatchLoadTransformStats = () => {
      dispatch({
        type: 'loadMetadataTransformStats',
      });
    };

    let mockedApis: ReturnType<typeof endpointPageHttpMock>;

    beforeEach(() => {
      mockedApis = endpointPageHttpMock(fakeHttpServices);
    });

    it('correctly fetches stats', async () => {
      const loadedDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      dispatchLoadTransformStats();
      await loadedDispatched;
      expect(mockedApis.responseProvider.metadataTransformStats).toHaveBeenCalled();
    });

    it('correctly sets loading', async () => {
      const loadingDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isLoadingResourceState(action.payload);
        },
      });

      dispatchLoadTransformStats();
      expect(await loadingDispatched).toBeTruthy();
    });

    it('correctly sets loaded state on success', async () => {
      const loadedDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      dispatchLoadTransformStats();
      const action = await loadedDispatched;
      const { data } = action.payload as LoadedResourceState<TransformStats[]>;
      expect(data).toEqual(failedTransformStateMock.transforms);
    });

    it('correctly sets failed state on api failure', async () => {
      const failedDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isFailedResourceState(action.payload);
        },
      });

      const apiError = new Error('hey look an error');
      mockedApis.responseProvider.metadataTransformStats.mockImplementation(() => {
        throw apiError;
      });

      dispatchLoadTransformStats();

      const failedAction = (await failedDispatched).payload as FailedResourceState<
        TransformStats[]
      >;
      expect(failedAction.error).toBe(apiError);
    });
  });
});
