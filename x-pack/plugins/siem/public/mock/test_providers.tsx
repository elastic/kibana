/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { I18nProvider } from '@kbn/i18n/react';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import * as React from 'react';
import { ApolloProvider } from 'react-apollo';
import { DragDropContext, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { pure } from 'recompose';
import { Store } from 'redux';
import { BehaviorSubject } from 'rxjs';
import { ThemeProvider } from 'styled-components';

import { KibanaConfigContext } from '../lib/adapters/framework/kibana_framework_adapter';
import { AppTestingFrameworkAdapter } from '../lib/adapters/framework/testing_framework_adapter';
import { createStore, State } from '../store';
import { mockGlobalState } from './global_state';
import { mockFrameworks } from './kibana_config';

const state: State = mockGlobalState;

interface Props {
  children: React.ReactNode;
  mockFramework?: Partial<AppTestingFrameworkAdapter>;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
}

export const apolloClient = new ApolloClient({
  cache: new Cache(),
  link: new ApolloLink((o, f) => (f ? f(o) : null)),
});

export const apolloClientObservable = new BehaviorSubject(apolloClient);

/** A utility for wrapping children in the providers required to run most tests */
export const TestProviders = pure<Props>(
  ({
    children,
    store = createStore(state, apolloClientObservable),
    mockFramework = mockFrameworks.default_UTC,
    onDragEnd = jest.fn(),
  }) => (
    <I18nProvider>
      <ApolloProvider client={apolloClient}>
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <KibanaConfigContext.Provider value={mockFramework}>
              <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
            </KibanaConfigContext.Provider>
          </ThemeProvider>
        </ReduxStoreProvider>
      </ApolloProvider>
    </I18nProvider>
  )
);

export const TestProviderWithoutDragAndDrop = pure<Props>(
  ({ children, store = createStore(state, apolloClientObservable) }) => (
    <I18nProvider>
      <ReduxStoreProvider store={store}>{children}</ReduxStoreProvider>
    </I18nProvider>
  )
);
