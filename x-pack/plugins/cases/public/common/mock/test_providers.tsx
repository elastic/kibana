/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render as reactRender } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ILicense } from '@kbn/licensing-plugin/public';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type { CasesFeatures, CasesPermissions } from '../../../common/ui/types';
import { CasesProvider } from '../../components/cases_context';
import { createStartServicesMock } from '../lib/kibana/kibana_react.mock';
import type { StartServices } from '../../types';
import type { ReleasePhase } from '../../components/types';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import { allCasesPermissions } from './permissions';

interface TestProviderProps {
  children: React.ReactNode;
  permissions?: CasesPermissions;
  features?: CasesFeatures;
  owner?: string[];
  releasePhase?: ReleasePhase;
  externalReferenceAttachmentTypeRegistry?: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry?: PersistableStateAttachmentTypeRegistry;
  license?: ILicense;
}
type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

window.scrollTo = jest.fn();

/** A utility for wrapping children in the providers required to run most tests */
const TestProvidersComponent: React.FC<TestProviderProps> = ({
  children,
  features,
  owner = [SECURITY_SOLUTION_OWNER],
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
  externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry(),
  persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry(),
  license,
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  const services = createStartServicesMock({ license });

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <CasesProvider
                value={{
                  externalReferenceAttachmentTypeRegistry,
                  persistableStateAttachmentTypeRegistry,
                  features,
                  owner,
                  permissions,
                }}
              >
                {children}
              </CasesProvider>
            </MemoryRouter>
          </QueryClientProvider>
        </ThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
TestProvidersComponent.displayName = 'TestProviders';

export const TestProviders = React.memo(TestProvidersComponent);

export interface AppMockRenderer {
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
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
  /**
   * React query prints the errors in the console even though
   * all tests are passings. We turn them off for testing.
   */
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {},
  },
});

export const createAppMockRenderer = ({
  features,
  owner = [SECURITY_SOLUTION_OWNER],
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
  externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry(),
  persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry(),
  license,
}: Omit<TestProviderProps, 'children'> = {}): AppMockRenderer => {
  const services = createStartServicesMock({ license });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <CasesProvider
                value={{
                  externalReferenceAttachmentTypeRegistry,
                  persistableStateAttachmentTypeRegistry,
                  features,
                  owner,
                  permissions,
                  releasePhase,
                }}
              >
                {children}
              </CasesProvider>
            </MemoryRouter>
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
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
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
