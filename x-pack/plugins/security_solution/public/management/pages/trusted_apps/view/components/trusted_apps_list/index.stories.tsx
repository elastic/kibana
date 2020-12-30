/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { storiesOf } from '@storybook/react';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { KibanaContextProvider } from '../../../../../../../../../../src/plugins/kibana_react/public';

import {
  createGlobalNoMiddlewareStore,
  createListFailedResourceState,
  createListLoadedResourceState,
  createListLoadingResourceState,
  createTrustedAppsListResourceStateChangedAction,
} from '../../../test_utils';

import { TrustedAppsList } from '.';

const now = 111111;

const renderList = (store: ReturnType<typeof createGlobalNoMiddlewareStore>) => (
  <Provider store={store}>
    <KibanaContextProvider services={{ uiSettings: { get: () => 'MMM D, YYYY @ HH:mm:ss.SSS' } }}>
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TrustedAppsList />
      </ThemeProvider>
    </KibanaContextProvider>
  </Provider>
);

storiesOf('TrustedApps/TrustedAppsList', module)
  .add('default', () => {
    return renderList(createGlobalNoMiddlewareStore());
  })
  .add('loading', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(createListLoadingResourceState())
    );

    return renderList(store);
  })
  .add('error', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListFailedResourceState('Intenal Server Error')
      )
    );

    return renderList(store);
  })
  .add('loaded', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ pageSize: 10 }, now)
      )
    );

    return renderList(store);
  })
  .add('loading second time', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadingResourceState(createListLoadedResourceState({ pageSize: 10 }, now))
      )
    );

    return renderList(store);
  })
  .add('long texts', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ pageSize: 10 }, now, true)
      )
    );

    return renderList(store);
  });
