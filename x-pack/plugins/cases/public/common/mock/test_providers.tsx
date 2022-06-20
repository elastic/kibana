/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeProvider } from 'styled-components';

import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CasesFeatures } from '../../../common/ui/types';
import { CasesProvider } from '../../components/cases_context';
import {
  createKibanaContextProviderMock,
  createStartServicesMock,
} from '../lib/kibana/kibana_react.mock';
import { FieldHook } from '../shared_imports';
import { StartServices } from '../../types';
import { ReleasePhase } from '../../components/types';
import { CasesPermissions } from '../../client/helpers/capabilities';

interface TestProviderProps {
  children: React.ReactNode;
  // TODO: convert to individual permissions
  permissions?: CasesPermissions;
  features?: CasesFeatures;
  owner?: string[];
  releasePhase?: ReleasePhase;
}
type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

window.scrollTo = jest.fn();
const MockKibanaContextProvider = createKibanaContextProviderMock();

/** A utility for wrapping children in the providers required to run most tests */
const TestProvidersComponent: React.FC<TestProviderProps> = ({
  children,
  features,
  owner = [SECURITY_SOLUTION_OWNER],
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
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
      <MockKibanaContextProvider>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <QueryClientProvider client={queryClient}>
            <CasesProvider value={{ features, owner, permissions }}>{children}</CasesProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </MockKibanaContextProvider>
    </I18nProvider>
  );
};
TestProvidersComponent.displayName = 'TestProviders';

export const TestProviders = React.memo(TestProvidersComponent);

export const allCasesPermissions = () => buildCasesPermissions();
export const noCasesPermissions = () =>
  buildCasesPermissions({ read: false, create: false, update: false, delete: false });
export const readCasesPermissions = () =>
  buildCasesPermissions({ create: false, update: false, delete: false });

export const buildCasesPermissions = (overrides: Partial<Omit<CasesPermissions, 'all'>> = {}) => {
  const read = overrides.read ?? true;
  const create = overrides.create ?? true;
  const update = overrides.update ?? true;
  const deleteCases = overrides.delete ?? true;

  return {
    all: read && create && update && deleteCases,
    read,
    update,
    create,
    delete: deleteCases,
  };
};

export interface AppMockRenderer {
  render: UiRender;
  coreStart: StartServices;
  queryClient: QueryClient;
  AppWrapper: React.FC<{ children: React.ReactElement }>;
}
export const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const createAppMockRenderer = ({
  features,
  owner = [SECURITY_SOLUTION_OWNER],
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
}: Omit<TestProviderProps, 'children'> = {}): AppMockRenderer => {
  const services = createStartServicesMock();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <QueryClientProvider client={queryClient}>
            <CasesProvider value={{ features, owner, permissions, releasePhase }}>
              {children}
            </CasesProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
  AppWrapper.displayName = 'AppWrapper';
  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };
  return {
    coreStart: services,
    queryClient,
    render,
    AppWrapper,
  };
};

export const useFormFieldMock = <T,>(options?: Partial<FieldHook<T>>): FieldHook<T> => ({
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
});
