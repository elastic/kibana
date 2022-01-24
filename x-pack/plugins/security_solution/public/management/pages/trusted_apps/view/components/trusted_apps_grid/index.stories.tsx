/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { storiesOf } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';
import { EuiHorizontalRule } from '@elastic/eui';

import { KibanaContextProvider } from '../../../../../../../../../../src/plugins/kibana_react/public';

import {
  createGlobalNoMiddlewareStore,
  createListFailedResourceState,
  createListLoadedResourceState,
  createListLoadingResourceState,
  createTrustedAppsListResourceStateChangedAction,
} from '../../../test_utils';

import { TrustedAppsGrid } from '.';

const now = 111111;

const renderGrid = (store: ReturnType<typeof createGlobalNoMiddlewareStore>) => (
  <Provider store={store}>
    <KibanaContextProvider services={{ uiSettings: { get: () => 'MMM D, YYYY @ HH:mm:ss.SSS' } }}>
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <EuiHorizontalRule margin="none" />

        <TrustedAppsGrid />

        <EuiHorizontalRule margin="none" />
      </ThemeProvider>
    </KibanaContextProvider>
  </Provider>
);

storiesOf('TrustedApps/TrustedAppsGrid', module)
  .add('default', () => {
    return renderGrid(createGlobalNoMiddlewareStore());
  })
  .add('loading', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(createListLoadingResourceState())
    );

    return renderGrid(store);
  })
  .add('error', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListFailedResourceState('Intenal Server Error')
      )
    );

    return renderGrid(store);
  })
  .add('loaded', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ pageSize: 10 }, now)
      )
    );

    return renderGrid(store);
  })
  .add('loading second time', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadingResourceState(createListLoadedResourceState({ pageSize: 10 }, now))
      )
    );

    return renderGrid(store);
  })
  .add('long texts', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction(
        createListLoadedResourceState({ pageSize: 10 }, now, true)
      )
    );

    return renderGrid(store);
  });
