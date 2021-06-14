/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import {
  Immutable,
  HostResultList,
  HostIsolationResponse,
  ActivityLog,
  ISOLATION_ACTIONS,
} from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import { mockEndpointResultList } from './mock_endpoint_result_list';
import { listData } from './selectors';
import { EndpointState } from '../types';
import { endpointListReducer } from './reducer';
import { endpointMiddlewareFactory } from './middleware';
import { getEndpointListPath, getEndpointDetailsPath } from '../../../common/routing';
import {
  createLoadedResourceState,
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
import { FleetActionGenerator } from '../../../../../common/endpoint/data_generators/fleet_action_generator';

jest.mock('../../policy/store/services/ingest', () => ({
  sendGetAgentConfigList: () => Promise.resolve({ items: [] }),
  sendGetAgentPolicyList: () => Promise.resolve({ items: [] }),
  sendGetEndpointSecurityPackage: () => Promise.resolve({}),
}));

jest.mock('../../../../common/lib/kibana');

type EndpointListStore = Store<Immutable<EndpointState>, Immutable<AppAction>>;

describe('endpoint list middleware', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let store: EndpointListStore;
  let getState: EndpointListStore['getState'];
  let dispatch: EndpointListStore['dispatch'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let actionSpyMiddleware;
  let history: History<never>;

  const getEndpointListApiResponse = (): HostResultList => {
    return mockEndpointResultList({ request_page_size: 1, request_page_index: 1, total: 10 });
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
        filters: { kql: '' },
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.hosts);
  });

  it('handles `appRequestedEndpointList`', async () => {
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
        filters: { kql: '' },
      }),
    });
    expect(listData(getState())).toEqual(apiResponse.hosts);
  });

  describe('handling of IsolateEndpointHost action', () => {
    const getKibanaServicesMock = KibanaServices.get as jest.Mock;
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
      getKibanaServicesMock.mockReturnValue(fakeCoreStart);
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
    const endpointList = getEndpointListApiResponse();
    const search = getEndpointDetailsPath({
      name: 'endpointDetails',
      selected_endpoint: endpointList.hosts[0].metadata.agent.id,
    });
    const dispatchUserChangedUrl = () => {
      dispatch({
        type: 'userChangedUrl',
        payload: {
          ...history.location,
          pathname: '/endpoints',
          search: `?${search.split('?').pop()}`,
        },
      });
    };

    const fleetActionGenerator = new FleetActionGenerator(Math.random().toString());
    const actionData = fleetActionGenerator.generate({
      agents: [endpointList.hosts[0].metadata.agent.id],
    });
    const responseData = fleetActionGenerator.generateResponse({
      agent_id: endpointList.hosts[0].metadata.agent.id,
    });
    const getMockEndpointActivityLog = () =>
      ({
        total: 2,
        page: 1,
        pageSize: 50,
        data: [
          {
            type: 'response',
            item: {
              id: '',
              data: responseData,
            },
          },
          {
            type: 'action',
            item: {
              id: '',
              data: actionData,
            },
          },
        ],
      } as ActivityLog);
    const dispatchGetActivityLog = () => {
      dispatch({
        type: 'endpointDetailsActivityLogChanged',
        payload: createLoadedResourceState(getMockEndpointActivityLog()),
      });
    };

    it('should set ActivityLog state to loading', async () => {
      dispatchUserChangedUrl();

      const loadingDispatched = waitForAction('endpointDetailsActivityLogChanged', {
        validate(action) {
          return isLoadingResourceState(action.payload);
        },
      });

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

      dispatchGetActivityLog();
      const loadedDispatchedResponse = await loadedDispatched;
      const activityLogData = (loadedDispatchedResponse.payload as LoadedResourceState<ActivityLog>)
        .data;

      expect(activityLogData).toEqual(getMockEndpointActivityLog());
    });
  });
});
