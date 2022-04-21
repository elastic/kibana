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
  ActivityLog,
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
  createLoadingResourceState,
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

  describe('handle ActivityLog State Change actions', () => {
    let mockedApis: ReturnType<typeof endpointPageHttpMock>;

    beforeEach(() => {
      mockedApis = endpointPageHttpMock(fakeHttpServices);
    });

    const endpointList = getEndpointListApiResponse();
    const agentId = endpointList.data[0].metadata.agent.id;
    const search = getEndpointDetailsPath({
      name: 'endpointActivityLog',
      selected_endpoint: agentId,
    });
    const dispatchUserChangedUrl = () => {
      dispatchUserChangedUrlToEndpointList({ search: `?${search.split('?').pop()}` });
    };

    const dispatchGetActivityLogLoading = () => {
      dispatch({
        type: 'endpointDetailsActivityLogChanged',
        payload: createLoadingResourceState(),
      });
    };

    const dispatchGetActivityLogPaging = ({ page = 1 }: { page: number }) => {
      dispatch({
        type: 'endpointDetailsActivityLogUpdatePaging',
        payload: {
          page,
          pageSize: 50,
          startDate: 'now-1d',
          endDate: 'now',
        },
      });
    };

    const dispatchGetActivityLogUpdateInvalidDateRange = ({
      isInvalidDateRange = false,
    }: {
      isInvalidDateRange: boolean;
    }) => {
      dispatch({
        type: 'endpointDetailsActivityLogUpdateIsInvalidDateRange',
        payload: {
          isInvalidDateRange,
        },
      });
    };

    it('should set ActivityLog state to loading', async () => {
      dispatchUserChangedUrl();

      const loadingDispatched = waitForAction('endpointDetailsActivityLogChanged', {
        validate(action) {
          return isLoadingResourceState(action.payload);
        },
      });
      dispatchGetActivityLogLoading();

      const loadingDispatchedResponse = await loadingDispatched;
      expect(loadingDispatchedResponse.payload.type).toEqual('LoadingResourceState');
    });

    it('should set ActivityLog state to loaded when fetching activity log is successful', async () => {
      dispatchUserChangedUrl();

      const loadedDispatched = waitForAction('endpointDetailsActivityLogChanged', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      const activityLogResponse = await loadedDispatched;
      expect(mockedApis.responseProvider.activityLogResponse).toHaveBeenCalledWith({
        path: expect.any(String),
        query: {
          end_date: 'now',
          start_date: 'now-1d',
          page: 1,
          page_size: 50,
        },
      });
      expect(activityLogResponse.payload.type).toEqual('LoadedResourceState');
    });

    it('should set ActivityLog to Failed if API call fails', async () => {
      dispatchUserChangedUrl();

      const apiError = new Error('oh oh');
      const failedDispatched = waitForAction('endpointDetailsActivityLogChanged', {
        validate(action) {
          return isFailedResourceState(action.payload);
        },
      });

      mockedApis.responseProvider.activityLogResponse.mockImplementation(() => {
        throw apiError;
      });

      const failedAction = (await failedDispatched).payload as FailedResourceState<ActivityLog>;
      expect(failedAction.error).toBe(apiError);
    });

    it('should not call API again if it fails', async () => {
      dispatchUserChangedUrl();

      const apiError = new Error('oh oh');
      const failedDispatched = waitForAction('endpointDetailsActivityLogChanged', {
        validate(action) {
          return isFailedResourceState(action.payload);
        },
      });

      mockedApis.responseProvider.activityLogResponse.mockImplementation(() => {
        throw apiError;
      });

      await failedDispatched;

      expect(mockedApis.responseProvider.activityLogResponse).toHaveBeenCalledTimes(1);
    });

    it('should not fetch Activity Log with invalid date ranges', async () => {
      dispatchUserChangedUrl();

      const updateInvalidDateRangeDispatched = waitForAction(
        'endpointDetailsActivityLogUpdateIsInvalidDateRange'
      );
      dispatchGetActivityLogUpdateInvalidDateRange({ isInvalidDateRange: true });
      await updateInvalidDateRangeDispatched;

      expect(mockedApis.responseProvider.activityLogResponse).not.toHaveBeenCalled();
    });

    it('should call get Activity Log API with valid date ranges', async () => {
      dispatchUserChangedUrl();

      const updatePagingDispatched = waitForAction('endpointDetailsActivityLogUpdatePaging');
      dispatchGetActivityLogPaging({ page: 1 });

      const updateInvalidDateRangeDispatched = waitForAction(
        'endpointDetailsActivityLogUpdateIsInvalidDateRange'
      );
      dispatchGetActivityLogUpdateInvalidDateRange({ isInvalidDateRange: false });
      await updateInvalidDateRangeDispatched;
      await updatePagingDispatched;

      expect(mockedApis.responseProvider.activityLogResponse).toHaveBeenCalled();
    });

    it('should call get Activity Log API with correct paging options', async () => {
      dispatchUserChangedUrl();
      const updatePagingDispatched = waitForAction('endpointDetailsActivityLogUpdatePaging');
      dispatchGetActivityLogPaging({ page: 3 });

      await updatePagingDispatched;

      expect(mockedApis.responseProvider.activityLogResponse).toHaveBeenCalledWith({
        path: expect.any(String),
        query: {
          page: 3,
          page_size: 50,
          start_date: 'now-1d',
          end_date: 'now',
        },
      });
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
            '6db499e5-4927-4350-abb8-d8318e7d0eec',
            'c082dda9-1847-4997-8eda-f1192d95bec3',
            '8aa1cd61-cc25-4783-afb5-0eefc4919c07',
            '47fe24c1-7370-419a-9732-3ff38bf41272',
            '0d2b2fa7-a9cd-49fc-ad5f-0252c642290e',
            'f480092d-0445-4bf3-9c96-8a3d5cb97824',
            '3850e676-0940-4c4b-aaca-571bd1bc66d9',
            '46efcc7a-086a-47a3-8f09-c4ecd6d2d917',
            'afa55826-b81b-4440-a2ac-0644d77a3fc6',
            '25b49e50-cb5c-43df-824f-67b8cf697d9d',
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

      // Note: these are left intenationally in sequence
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
