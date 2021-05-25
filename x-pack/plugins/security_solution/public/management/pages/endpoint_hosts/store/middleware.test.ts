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
} from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import { mockEndpointResultList } from './mock_endpoint_result_list';
import { listData } from './selectors';
import { EndpointState } from '../types';
import { endpointListReducer } from './reducer';
import { endpointMiddlewareFactory } from './middleware';
import { getEndpointListPath } from '../../../common/routing';
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
} from '../../../../common/lib/host_isolation/mocks';

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
    const dispatchIsolateEndpointHost = () => {
      dispatch({
        type: 'endpointIsolationRequest',
        payload: hostIsolationRequestBodyMock(),
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
      expect(fakeHttpServices.post).toHaveBeenCalled();
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
});
