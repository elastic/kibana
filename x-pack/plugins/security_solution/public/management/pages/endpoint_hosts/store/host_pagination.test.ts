/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, HttpSetup } from 'kibana/public';
import { History, createBrowserHistory } from 'history';
import { applyMiddleware, Store, createStore } from 'redux';

import { coreMock } from '../../../../../../../../src/core/public/mocks';

import { HostResultList, AppLocation } from '../../../../../common/endpoint/types';
import { DepsStartMock, depsStartMock } from '../../../../common/mock/endpoint';

import { hostMiddlewareFactory } from './middleware';

import { hostListReducer } from './reducer';

import { uiQueryParams } from './selectors';
import { mockHostResultList } from './mock_host_result_list';
import { HostState, HostIndexUIQueryParams } from '../types';
import {
  MiddlewareActionSpyHelper,
  createSpyMiddleware,
} from '../../../../common/store/test_utils';
import { getHostListPath } from '../../../common/routing';

describe('host list pagination: ', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let history: History<AppLocation['state']>;
  let store: Store;
  let queryParams: () => HostIndexUIQueryParams;
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let actionSpyMiddleware;
  const getEndpointListApiResponse = (): HostResultList => {
    return mockHostResultList({ request_page_size: 1, request_page_index: 1, total: 10 });
  };

  let historyPush: (params: HostIndexUIQueryParams) => void;
  beforeEach(() => {
    fakeCoreStart = coreMock.createStart();
    depsStart = depsStartMock();
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
    history = createBrowserHistory();
    const middleware = hostMiddlewareFactory(fakeCoreStart, depsStart);
    ({ actionSpyMiddleware, waitForAction } = createSpyMiddleware<HostState>());
    store = createStore(hostListReducer, applyMiddleware(middleware, actionSpyMiddleware));

    history.listen((location) => {
      store.dispatch({ type: 'userChangedUrl', payload: location });
    });

    queryParams = () => uiQueryParams(store.getState());

    historyPush = (nextQueryParams: HostIndexUIQueryParams): void => {
      return history.push(getHostListPath({ name: 'hostList', ...nextQueryParams }));
    };
  });

  describe('when the user enteres the host list for the first time', () => {
    it('the api is called with page_index and page_size defaulting to 0 and 10 respectively', async () => {
      const apiResponse = getEndpointListApiResponse();
      fakeHttpServices.post.mockResolvedValue(apiResponse);
      expect(fakeHttpServices.post).not.toHaveBeenCalled();

      store.dispatch({
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
    });
  });
  describe('when a new page size is passed', () => {
    it('should modify the url correctly', () => {
      historyPush({ ...queryParams(), page_size: '20' });
      expect(queryParams()).toMatchInlineSnapshot(`
        Object {
          "page_index": "0",
          "page_size": "20",
        }
      `);
    });
  });
  describe('when an invalid page size is passed', () => {
    it('should modify the page size in the url to the default page size', () => {
      historyPush({ ...queryParams(), page_size: '1' });
      expect(queryParams()).toEqual({ page_index: '0', page_size: '10' });
    });
  });

  describe('when a negative page size is passed', () => {
    it('should modify the page size in the url to the default page size', () => {
      historyPush({ ...queryParams(), page_size: '-1' });
      expect(queryParams()).toEqual({ page_index: '0', page_size: '10' });
    });
  });

  describe('when a new page index is passed', () => {
    it('should modify the page index in the url correctly', () => {
      historyPush({ ...queryParams(), page_index: '2' });
      expect(queryParams()).toEqual({ page_index: '2', page_size: '10' });
    });
  });

  describe('when a negative page index is passed', () => {
    it('should modify the page index in the url to the default page index', () => {
      historyPush({ ...queryParams(), page_index: '-2' });
      expect(queryParams()).toEqual({ page_index: '0', page_size: '10' });
    });
  });

  describe('when invalid params are passed in the url', () => {
    it('ignores non-numeric values for page_index and page_size', () => {
      historyPush({ ...queryParams, page_index: 'one', page_size: 'fifty' });
      expect(queryParams()).toEqual({ page_index: '0', page_size: '10' });
    });

    it('ignores unknown url search params', () => {
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          ...history.location,
          pathname: '/endpoint-hosts',
          search: '?foo=bar',
        },
      });
      expect(queryParams()).toEqual({ page_index: '0', page_size: '10' });
    });

    it('ignores multiple values of the same query params except the last value', () => {
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          ...history.location,
          pathname: '/endpoint-hosts',
          search: '?page_index=2&page_index=3&page_size=20&page_size=50',
        },
      });
      expect(queryParams()).toEqual({ page_index: '3', page_size: '50' });
    });
  });
});
