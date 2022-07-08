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
import { CasesCapabilities, CasesFeatures, CasesPermissions } from '../../../common/ui/types';
import { CasesProvider } from '../../components/cases_context';
import {
  createKibanaContextProviderMock,
  createStartServicesMock,
} from '../lib/kibana/kibana_react.mock';
import { FieldHook } from '../shared_imports';
import { StartServices } from '../../types';
import { ReleasePhase } from '../../components/types';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';

interface TestProviderProps {
  children: React.ReactNode;
  permissions?: CasesPermissions;
  features?: CasesFeatures;
  owner?: string[];
  releasePhase?: ReleasePhase;
  externalReferenceAttachmentTypeRegistry?: ExternalReferenceAttachmentTypeRegistry;
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
  externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry(),
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
            <CasesProvider
              value={{ externalReferenceAttachmentTypeRegistry, features, owner, permissions }}
            >
              {children}
            </CasesProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </MockKibanaContextProvider>
    </I18nProvider>
  );
};
TestProvidersComponent.displayName = 'TestProviders';

export const TestProviders = React.memo(TestProvidersComponent);

export interface AppMockRenderer {
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
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

export const allCasesPermissions = () => buildCasesPermissions();
export const noCasesPermissions = () =>
  buildCasesPermissions({ read: false, create: false, update: false, delete: false, push: false });
export const readCasesPermissions = () =>
  buildCasesPermissions({ read: true, create: false, update: false, delete: false, push: false });
export const noCreateCasesPermissions = () => buildCasesPermissions({ create: false });
export const noUpdateCasesPermissions = () => buildCasesPermissions({ update: false });
export const noPushCasesPermissions = () => buildCasesPermissions({ push: false });
export const noDeleteCasesPermissions = () => buildCasesPermissions({ delete: false });
export const writeCasesPermissions = () => buildCasesPermissions({ read: false });

export const buildCasesPermissions = (overrides: Partial<Omit<CasesPermissions, 'all'>> = {}) => {
  const create = overrides.create ?? true;
  const read = overrides.read ?? true;
  const update = overrides.update ?? true;
  const deletePermissions = overrides.delete ?? true;
  const push = overrides.push ?? true;
  const all = create && read && update && deletePermissions && push;

  return {
    all,
    create,
    read,
    update,
    delete: deletePermissions,
    push,
  };
};

export const allCasesCapabilities = () => buildCasesCapabilities();
export const noCasesCapabilities = () =>
  buildCasesCapabilities({
    create_cases: false,
    read_cases: false,
    update_cases: false,
    delete_cases: false,
    push_cases: false,
  });
export const readCasesCapabilities = () =>
  buildCasesCapabilities({
    create_cases: false,
    update_cases: false,
    delete_cases: false,
    push_cases: false,
  });
export const writeCasesCapabilities = () => {
  return buildCasesCapabilities({
    read_cases: false,
  });
};

export const buildCasesCapabilities = (overrides?: Partial<CasesCapabilities>) => {
  return {
    create_cases: overrides?.create_cases ?? true,
    read_cases: overrides?.read_cases ?? true,
    update_cases: overrides?.update_cases ?? true,
    delete_cases: overrides?.delete_cases ?? true,
    push_cases: overrides?.push_cases ?? true,
  };
};

export const createAppMockRenderer = ({
  features,
  owner = [SECURITY_SOLUTION_OWNER],
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
  externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry(),
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
            <CasesProvider
              value={{
                externalReferenceAttachmentTypeRegistry,
                features,
                owner,
                permissions,
                releasePhase,
              }}
            >
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
    externalReferenceAttachmentTypeRegistry,
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
