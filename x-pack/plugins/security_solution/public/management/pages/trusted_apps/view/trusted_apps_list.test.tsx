/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineReducers, createStore } from 'redux';
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE,
} from '../../../common/constants';
import { trustedAppsPageReducer } from '../store/reducer';
import { TrustedAppsList } from './trusted_apps_list';
import {
  createListFailedResourceState,
  createListLoadedResourceState,
  createListLoadingResourceState,
  createTrustedAppsListResourceStateChangedAction,
  createUserChangedUrlAction,
} from '../test_utils';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

const createStoreSetup = () => {
  return createStore(
    combineReducers({
      [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: combineReducers({
        [MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE]: trustedAppsPageReducer,
      }),
    })
  );
};

const renderList = (store: ReturnType<typeof createStoreSetup>) => {
  const Wrapper: React.FC = ({ children }) => <Provider store={store}>{children}</Provider>;

  return render(<TrustedAppsList />, { wrapper: Wrapper });
};

describe('TrustedAppsList', () => {
  it('renders correctly initially', () => {
    expect(renderList(createStoreSetup()).container).toMatchSnapshot();
  });

  it('renders correctly when loading data for the first time', () => {
    const store = createStoreSetup();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(createListLoadingResourceState())
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when failed loading data for the first time', () => {
    const store = createStoreSetup();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListFailedResourceState('Intenal Server Error')
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when loaded data', () => {
    const store = createStoreSetup();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ index: 0, size: 20 }, 200)
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when new page and page sie set (not loading yet)', () => {
    const store = createStoreSetup();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ index: 0, size: 20 }, 200)
      )
    );
    store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when loading data for the second time', () => {
    const store = createStoreSetup();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadingResourceState(createListLoadedResourceState({ index: 0, size: 20 }, 200))
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when failed loading data for the second time', () => {
    const store = createStoreSetup();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListFailedResourceState(
          'Intenal Server Error',
          createListLoadedResourceState({ index: 0, size: 20 }, 200)
        )
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });
});
