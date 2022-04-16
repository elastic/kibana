/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';

import React from 'react';
import { DragDropContext, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { Store } from 'redux';
import { BehaviorSubject } from 'rxjs';
import { ThemeProvider } from 'styled-components';
import { Capabilities } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from 'react-query';

import { createStore, State } from '../store';
import { mockGlobalState } from './global_state';
import {
  createKibanaContextProviderMock,
  createStartServicesMock,
} from '../lib/kibana/kibana_react.mock';
import { FieldHook } from '../../shared_imports';
import { SUB_PLUGINS_REDUCER } from './utils';
import { createSecuritySolutionStorageMock, localStorageMock } from './mock_local_storage';
import { CASES_FEATURE_ID } from '../../../common/constants';
import { UserPrivilegesProvider } from '../components/user_privileges/user_privileges_context';

const state: State = mockGlobalState;

interface Props {
  children?: React.ReactNode;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
}

export const kibanaObservable = new BehaviorSubject(createStartServicesMock());

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
});
window.scrollTo = jest.fn();
const MockKibanaContextProvider = createKibanaContextProviderMock();
const { storage } = createSecuritySolutionStorageMock();

/** A utility for wrapping children in the providers required to run most tests */
export const TestProvidersComponent: React.FC<Props> = ({
  children,
  store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage),
  onDragEnd = jest.fn(),
}) => {
  const queryClient = new QueryClient();
  return (
    <I18nProvider>
      <MockKibanaContextProvider>
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <QueryClientProvider client={queryClient}>
              <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
            </QueryClientProvider>
          </ThemeProvider>
        </ReduxStoreProvider>
      </MockKibanaContextProvider>
    </I18nProvider>
  );
};

/**
 * A utility for wrapping children in the providers required to run most tests
 * WITH user privileges provider.
 */
const TestProvidersWithPrivilegesComponent: React.FC<Props> = ({
  children,
  store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage),
  onDragEnd = jest.fn(),
}) => (
  <I18nProvider>
    <MockKibanaContextProvider>
      <ReduxStoreProvider store={store}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <UserPrivilegesProvider
            kibanaCapabilities={
              {
                siem: { show: true, crud: true },
                [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
              } as unknown as Capabilities
            }
          >
            <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
          </UserPrivilegesProvider>
        </ThemeProvider>
      </ReduxStoreProvider>
    </MockKibanaContextProvider>
  </I18nProvider>
);

export const TestProviders = React.memo(TestProvidersComponent);
export const TestProvidersWithPrivileges = React.memo(TestProvidersWithPrivilegesComponent);

export const useFormFieldMock = <T,>(options?: Partial<FieldHook<T>>): FieldHook<T> => {
  return {
    path: 'path',
    type: 'type',
    value: 'mockedValue' as unknown as T,
    isPristine: false,
    isDirty: false,
    isModified: false,
    isValidating: false,
    isValidated: false,
    isChangingValue: false,
    errors: [],
    isValid: true,
    getErrorsMessages: jest.fn(),
    onChange: jest.fn(),
    setValue: jest.fn(),
    setErrors: jest.fn(),
    clearErrors: jest.fn(),
    validate: jest.fn(),
    reset: jest.fn(),
    __isIncludedInOutput: true,
    __serializeValue: jest.fn(),
    ...options,
  };
};
