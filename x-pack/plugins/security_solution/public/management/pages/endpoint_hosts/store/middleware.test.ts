/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, HttpSetup } from '@kbn/core/public';
import { applyMiddleware, createStore, Store } from 'redux';
import { coreMock } from '@kbn/core/public/mocks';
import { History, createBrowserHistory } from 'history';
import { DepsStartMock, depsStartMock } from '../../../../common/mock/endpoint';
import {
  createSpyMiddleware,
  MiddlewareActionSpyHelper,
} from '../../../../common/store/test_utils';
import {
  Immutable,
  HostIsolationResponse,
  ISOLATION_ACTIONS,
  MetadataListResponse,
} from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import { mockEndpointResultList } from './mock_endpoint_result_list';
import { listData } from './selectors';
import { EndpointState, TransformStats } from '../types';
import { endpointListReducer } from './reducer';
import { endpointMiddlewareFactory } from './middleware';
import { getEndpointListPath, getEndpointDetailsPath } from '../../../common/routing';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import {
  FailedResourceState,
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
  LoadedResourceState,
} from '../../../state';
import { KibanaServices } from '../../../../common/lib/kibana';
import {
  hostIsolationHttpMocks,
  hostIsolationRequestBodyMock,
  hostIsolationResponseMock,
} from '../../../../common/lib/endpoint_isolation/mocks';
import { endpointPageHttpMock, failedTransformStateMock } from '../mocks';
import {
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
} from '../../../../../common/endpoint/constants';

jest.mock('../../../services/policies/ingest', () => ({
  sendGetAgentConfigList: () => Promise.resolve({ items: [] }),
  sendGetAgentPolicyList: () => Promise.resolve({ items: [] }),
  sendGetEndpointSecurityPackage: () => Promise.resolve({ version: '1.1.1' }),
  sendGetFleetAgentsWithEndpoint: () => Promise.resolve({ total: 0 }),
}));

jest.mock('../../../../common/lib/kibana');

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
    });
    expect(listData(getState())).toEqual(apiResponse.data);
  });

  it('handles `appRequestedEndpointList`', async () => {
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
      waitForAction('serverReturnedEndpointsTotal'),
      waitForAction('serverReturnedMetadataPatterns'),
      waitForAction('serverCancelledPolicyItemsLoading'),
      waitForAction('serverReturnedEndpointExistValue'),
      waitForAction('serverReturnedAgenstWithEndpointsTotal'),
    ]);

    expect(fakeHttpServices.get).toHaveBeenNthCalledWith(1, HOST_METADATA_LIST_ROUTE, {
      query: {
        page: '0',
        pageSize: '10',
        kuery: '',
      },
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
        query: {
          agent_ids: [
            '0dc3661d-6e67-46b0-af39-6f12b025fcb0',
            'a8e32a61-2685-47f0-83eb-edf157b8e616',
            '37e219a8-fe16-4da9-bf34-634c5824b484',
            '2484eb13-967e-4491-bf83-dffefdfe607c',
            '0bc08ef6-6d6a-4113-92f2-b97811187c63',
            'f4127d87-b567-4a6e-afa6-9a1c7dc95f01',
            'f9ab5b8c-a43e-4e80-99d6-11570845a697',
            '406c4b6a-ca57-4bd1-bc66-d9d999df3e70',
            '2da1dd51-f7af-4f0e-b64c-e7751c74b0e7',
            '89a94ea4-073c-4cb6-90a2-500805837027',
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

  describe('loads selected endpoint details', () => {
    beforeEach(() => {
      endpointPageHttpMock(fakeHttpServices);
    });

    const endpointList = getEndpointListApiResponse();
    const agentId = endpointList.data[0].metadata.agent.id;
    const search = getEndpointDetailsPath({
      name: 'endpointDetails',
      selected_endpoint: agentId,
    });
    const dispatchUserChangedUrl = () => {
      dispatchUserChangedUrlToEndpointList({ search: `?${search.split('?').pop()}` });
    };

    it('triggers the endpoint details related actions when the url is changed', async () => {
      dispatchUserChangedUrl();

      // Note: these are left intentionally in sequence
      // to test specific race conditions that currently exist in the middleware
      await waitForAction('serverCancelledPolicyItemsLoading');

      // loads the endpoints list
      await waitForAction('serverReturnedEndpointList');

      // loads the specific endpoint details
      await waitForAction('serverReturnedEndpointDetails');

      // loads the specific endpoint pending actions
      await waitForAction('endpointPendingActionsStateChanged');

      expect(fakeHttpServices.get).toHaveBeenCalledWith(
        resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: agentId })
      );
    });

    it('handles the endpointDetailsLoad action', async () => {
      const endpointId = agentId;
      dispatch({
        type: 'endpointDetailsLoad',
        payload: {
          endpointId,
        },
      });

      // note: this action does not load the endpoints list

      // loads the specific endpoint details
      await waitForAction('serverReturnedEndpointDetails');
      await waitForAction('serverReturnedEndpointNonExistingPolicies');

      // loads the specific endpoint pending actions
      await waitForAction('endpointPendingActionsStateChanged');

      expect(fakeHttpServices.get).toHaveBeenCalledWith(
        resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: endpointId })
      );
    });
  });
});
