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
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { DragDropContext, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { Store } from 'redux';
import { BehaviorSubject } from 'rxjs';
import { ThemeProvider } from 'styled-components';

import { createStore, State } from '../store';
import { mockGlobalState } from './global_state';
import { createKibanaContextProviderMock, createStartServices } from './kibana_react';
import { FieldHook, useForm } from '../../shared_imports';
import { SUB_PLUGINS_REDUCER } from './utils';
import { createSecuritySolutionStorageMock, localStorageMock } from './mock_local_storage';

const state: State = mockGlobalState;

interface Props {
  children: React.ReactNode;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
}

export const apolloClient = new ApolloClient({
  cache: new Cache(),
  link: new ApolloLink((o, f) => (f ? f(o) : null)),
});

export const apolloClientObservable = new BehaviorSubject(apolloClient);
export const kibanaObservable = new BehaviorSubject(createStartServices());

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
});

const MockKibanaContextProvider = createKibanaContextProviderMock();
const { storage } = createSecuritySolutionStorageMock();

/** A utility for wrapping children in the providers required to run most tests */
const TestProvidersComponent: React.FC<Props> = ({
  children,
  store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  ),
  onDragEnd = jest.fn(),
}) => (
  <I18nProvider>
    <MockKibanaContextProvider>
      <ApolloProvider client={apolloClient}>
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
          </ThemeProvider>
        </ReduxStoreProvider>
      </ApolloProvider>
    </MockKibanaContextProvider>
  </I18nProvider>
);

export const TestProviders = React.memo(TestProvidersComponent);

const TestProviderWithoutDragAndDropComponent: React.FC<Props> = ({
  children,
  store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  ),
}) => (
  <I18nProvider>
    <ReduxStoreProvider store={store}>{children}</ReduxStoreProvider>
  </I18nProvider>
);

export const TestProviderWithoutDragAndDrop = React.memo(TestProviderWithoutDragAndDropComponent);

export const useFormFieldMock = (options?: Partial<FieldHook>): FieldHook => {
  const { form } = useForm();

  return {
    path: 'path',
    type: 'type',
    value: [],
    isPristine: false,
    isValidating: false,
    isValidated: false,
    isChangingValue: false,
    form,
    errors: [],
    isValid: true,
    getErrorsMessages: jest.fn(),
    onChange: jest.fn(),
    setValue: jest.fn(),
    setErrors: jest.fn(),
    clearErrors: jest.fn(),
    validate: jest.fn(),
    reset: jest.fn(),
    __serializeOutput: jest.fn(),
    ...options,
  };
};
