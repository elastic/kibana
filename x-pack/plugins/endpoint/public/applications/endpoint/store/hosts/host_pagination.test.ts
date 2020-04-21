/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { DepsStartMock, depsStartMock } from '../../mocks';
import { AppAction, HostState, HostIndexUIQueryParams } from '../../types';
import { Immutable } from '../../../../../common/types';
import { History, createBrowserHistory } from 'history';
import { hostMiddlewareFactory } from './middleware';
import { applyMiddleware, Store, createStore } from 'redux';
import { hostListReducer } from './reducer';
import { coreMock } from 'src/core/public/mocks';
import { urlFromQueryParams } from '../../view/hosts/url_from_query_params';
import { uiQueryParams } from './selectors';

describe('host list pagination: ', () => {
  let store: Store<Immutable<HostState>, Immutable<AppAction>>;
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let history: History<never>;
  let queryParams: () => HostIndexUIQueryParams;

  let historyPush: (params: HostIndexUIQueryParams) => void;
  beforeEach(() => {
    fakeCoreStart = coreMock.createStart();
    depsStart = depsStartMock();
    history = createBrowserHistory();

    const middleware = hostMiddlewareFactory(fakeCoreStart, depsStart);
    store = createStore(hostListReducer, applyMiddleware(middleware));

    history.listen(location => {
      store.dispatch({ type: 'userChangedUrl', payload: location });
    });

    queryParams = () => uiQueryParams(store.getState());

    historyPush = (nextQueryParams: HostIndexUIQueryParams): void => {
      return history.push(urlFromQueryParams(nextQueryParams));
    };
  });

  describe('when a new page size is passed', () => {
    beforeEach(() => {
      historyPush({ ...queryParams(), page_size: '20' });
    });
    it('should modify the url correctly', () => {
      expect(queryParams()).toMatchInlineSnapshot(`
        Object {
          "page_index": "0",
          "page_size": "20",
        }
      `);
    });
  });
  describe('when an invalid page size is passed', () => {
    beforeEach(() => {
      historyPush({ ...queryParams(), page_size: '1' });
    });
    it('should modify the page size in the url to the default page size', () => {
      expect(queryParams()).toEqual({ page_index: '0', page_size: '10' });
    });
  });

  describe('when a new page index is passed', () => {
    beforeEach(() => {
      historyPush({ ...queryParams(), page_index: '2' });
    });
    it('should modify the page index in the url correctly', () => {
      expect(queryParams()).toEqual({ page_index: '2', page_size: '10' });
    });
  });
});
