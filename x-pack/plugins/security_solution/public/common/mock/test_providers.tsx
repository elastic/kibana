/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';

import React from 'react';
import type { DropResult, ResponderProvided } from '@hello-pangea/dnd';
import { DragDropContext } from '@hello-pangea/dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import type { Store } from 'redux';
import { ThemeProvider } from 'styled-components';
import type { Capabilities } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Action } from '@kbn/ui-actions-plugin/public';
import { CellActionsProvider } from '@kbn/cell-actions';
import { TestProvider as ExpandableFlyoutTestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { useKibana } from '../lib/kibana';
import { UpsellingProvider } from '../components/upselling_provider';
import { MockAssistantProvider } from './mock_assistant_provider';
import { ConsoleManager } from '../../management/components/console';
import {
  createKibanaContextProviderMock,
  createStartServicesMock,
} from '../lib/kibana/kibana_react.mock';
import type { FieldHook } from '../../shared_imports';
import { localStorageMock } from './mock_local_storage';
import { ASSISTANT_FEATURE_ID, CASES_FEATURE_ID } from '../../../common/constants';
import { UserPrivilegesProvider } from '../components/user_privileges/user_privileges_context';
import { MockDiscoverInTimelineContext } from '../components/discover_in_timeline/mocks/discover_in_timeline_provider';
import { createMockStore } from './create_store';
import type { StartServices } from '../../types';

interface Props {
  children?: React.ReactNode;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
  cellActions?: Action[];
  startServices?: StartServices;
}

export const kibanaMock = createStartServicesMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
});
window.scrollTo = jest.fn();
const MockKibanaContextProvider = createKibanaContextProviderMock();

/** A utility for wrapping children in the providers required to run most tests */
export const TestProvidersComponent: React.FC<Props> = ({
  children,
  store = createMockStore(),
  startServices,
  onDragEnd = jest.fn(),
  cellActions = [],
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: () => {},
    },
  });

  return (
    <I18nProvider>
      <MockKibanaContextProvider startServices={startServices}>
        <UpsellingProviderMock>
          <ReduxStoreProvider store={store}>
            <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
              <QueryClientProvider client={queryClient}>
                <MockDiscoverInTimelineContext>
                  <MockAssistantProvider>
                    <ExpandableFlyoutTestProvider>
                      <ConsoleManager>
                        <CellActionsProvider
                          getTriggerCompatibleActions={() => Promise.resolve(cellActions)}
                        >
                          <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
                        </CellActionsProvider>
                      </ConsoleManager>
                    </ExpandableFlyoutTestProvider>
                  </MockAssistantProvider>
                </MockDiscoverInTimelineContext>
              </QueryClientProvider>
            </ThemeProvider>
          </ReduxStoreProvider>
        </UpsellingProviderMock>
      </MockKibanaContextProvider>
    </I18nProvider>
  );
};

const UpsellingProviderMock = ({ children }: React.PropsWithChildren<{}>) => {
  const upselingService = useKibana().services.upselling;

  return <UpsellingProvider upsellingService={upselingService}>{children}</UpsellingProvider>;
};

/**
 * A utility for wrapping children in the providers required to run most tests
 * WITH user privileges provider.
 */
const TestProvidersWithPrivilegesComponent: React.FC<Props> = ({
  children,
  store = createMockStore(),
  onDragEnd = jest.fn(),
  startServices,
  cellActions = [],
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return (
    <I18nProvider>
      <MockKibanaContextProvider startServices={startServices}>
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <QueryClientProvider client={queryClient}>
              <MockDiscoverInTimelineContext>
                <MockAssistantProvider>
                  <UserPrivilegesProvider
                    kibanaCapabilities={
                      {
                        siem: { show: true, crud: true },
                        [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
                        [ASSISTANT_FEATURE_ID]: { 'ai-assistant': true },
                      } as unknown as Capabilities
                    }
                  >
                    <CellActionsProvider
                      getTriggerCompatibleActions={() => Promise.resolve(cellActions)}
                    >
                      <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
                    </CellActionsProvider>
                  </UserPrivilegesProvider>
                </MockAssistantProvider>
              </MockDiscoverInTimelineContext>
            </QueryClientProvider>
          </ThemeProvider>
        </ReduxStoreProvider>
      </MockKibanaContextProvider>
    </I18nProvider>
  );
};

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
