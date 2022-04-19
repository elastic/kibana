/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import {
  createSampleTrustedApp,
  createListFailedResourceState,
  createListLoadedResourceState,
  createListLoadingResourceState,
  createTrustedAppsListResourceStateChangedAction,
  createUserChangedUrlAction,
  createGlobalNoMiddlewareStore,
} from '../../../test_utils';
import { TrustedAppsGrid } from '.';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

jest.mock('../../../../../../common/lib/kibana');

const now = 111111;

const renderList = (store: ReturnType<typeof createGlobalNoMiddlewareStore>) => {
  const Wrapper: React.FC = ({ children }) => (
    <Provider store={store}>
      <EuiThemeProvider>{children}</EuiThemeProvider>
    </Provider>
  );

  return render(<TrustedAppsGrid />, { wrapper: Wrapper });
};

describe('TrustedAppsGrid', () => {
  it('renders correctly initially', () => {
    expect(renderList(createGlobalNoMiddlewareStore()).container).toMatchSnapshot();
  });

  it('renders correctly when loading data for the first time', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(createListLoadingResourceState())
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when failed loading data for the first time', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListFailedResourceState('Intenal Server Error')
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when loaded data', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ pageSize: 10 }, now)
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when new page and page size set (not loading yet)', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ pageSize: 10 }, now)
      )
    );
    store.dispatch(
      createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when loading data for the second time', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadingResourceState(createListLoadedResourceState({ pageSize: 10 }, now))
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('renders correctly when failed loading data for the second time', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListFailedResourceState(
          'Intenal Server Error',
          createListLoadedResourceState({ pageSize: 10 }, now)
        )
      )
    );

    expect(renderList(store).container).toMatchSnapshot();
  });

  it('triggers deletion dialog when delete action clicked', async () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ pageSize: 10 }, now)
      )
    );
    store.dispatch = jest.fn();

    const renderResult = renderList(store);

    await act(async () => {
      (await renderResult.findAllByTestId('trustedAppCard-header-actions-button'))[0].click();
    });

    await act(async () => {
      (await renderResult.findByTestId('deleteTrustedAppAction')).click();
    });

    expect(store.dispatch).toBeCalledWith({
      type: 'trustedAppDeletionDialogStarted',
      payload: {
        entry: createSampleTrustedApp(0),
      },
    });
  });
});
