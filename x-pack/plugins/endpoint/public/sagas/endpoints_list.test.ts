/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../../src/core/public/mocks';
import { AppMountContext } from 'kibana/public';
import { applyMiddleware, combineReducers, createStore, Store } from 'redux';
import { endpointListReducer } from '../reducers/endpoints_list';
import { createSagaMiddleware, SagaContext } from '../lib/saga';
import { endpointsListSaga } from './endpoints_list';
import { actions } from '../actions/endpoints_list';

jest.mock('./common.ts', () => {
  return {
    withPageNavigationStatus: async function* withPageNavigationStatus({
      actionsAndState,
      isOnPage = function() {
        return false;
      },
    }: {
      actionsAndState: SagaContext['actionsAndState'];
      isOnPage: (href: any) => boolean;
    }) {
      for await (const { action, state } of actionsAndState()) {
        yield {
          action,
          state,
          href: '',
          previousHref: '',
          hrefChanged: true,
          authenticationStatusChanged: true,
          userIsOnPageAndLoggedIn: isOnPage('http://localhost/mock/app/endpoint/endpoints'),
          shouldInitialize: false,
        };
      }
    },
  };
});

jest.mock('../concerns/routing.ts', () => {
  return {
    hrefIsForPath() {
      return true;
    },
  };
});

describe('endpoints_list saga', () => {
  const sleep = (ms = 100) => new Promise(wakeup => setTimeout(wakeup, ms));
  let fakeAppMountContext: AppMountContext;
  let store: Store;

  const withAppMountContext = () => {
    return async (sagaContext: SagaContext) => {
      await endpointsListSaga(sagaContext, fakeAppMountContext).catch(e => {
        // eslint-disable-next-line no-console
        console.error(e);
        return Promise.reject(e);
      });
    };
  };

  const storeReducers = combineReducers({
    endpointsList: endpointListReducer,
  });

  beforeEach(() => {
    // This is probably so wrong :-(
    fakeAppMountContext = ({
      core: coreMock.createSetup({ basePath: '/mock' }),
    } as unknown) as AppMountContext;

    const storeSagaMiddleware = createSagaMiddleware(withAppMountContext());

    store = createStore(storeReducers, applyMiddleware(storeSagaMiddleware));
    storeSagaMiddleware.run();
  });

  test('it is coreSetup', async () => {
    expect(fakeAppMountContext.core.http.get).not.toHaveBeenCalled();

    store.dispatch(
      actions.userPaginatedOrSortedEndpointListTable({
        sortDirection: 'asc',
        pageSize: 20,
        pageIndex: 2,
        sortField: 'Name',
      })
    );

    await sleep();
    expect(fakeAppMountContext.core.http.get).toHaveBeenLastCalledWith('/api/endpoint/endpoints', {
      query: {
        pageIndex: 2,
        pageSize: 20,
        sortField: 'Name',
        sortDirection: 'asc',
      },
    });
  });
});
