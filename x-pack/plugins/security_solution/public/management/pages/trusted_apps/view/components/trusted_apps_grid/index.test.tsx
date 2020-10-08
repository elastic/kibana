/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

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

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

const now = 111111;

const renderList = (store: ReturnType<typeof createGlobalNoMiddlewareStore>) => {
  const Wrapper: React.FC = ({ children }) => (
    <Provider store={store}>
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        {children}
      </ThemeProvider>
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
    store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

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

    (await renderList(store).findAllByTestId('trustedAppDeleteButton'))[0].click();

    expect(store.dispatch).toBeCalledWith({
      type: 'trustedAppDeletionDialogStarted',
      payload: {
        entry: createSampleTrustedApp(0),
      },
    });
  });
});
