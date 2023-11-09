/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import { render as reactRender } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ILicense } from '@kbn/licensing-plugin/public';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';

import { euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { FilesContext } from '@kbn/shared-ux-file-context';

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { CasesFeatures, CasesPermissions } from '../../../common/ui/types';
import type { StartServices } from '../../types';
import type { ReleasePhase } from '../../components/types';

import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CasesProvider } from '../../components/cases_context';
import { createStartServicesMock } from '../lib/kibana/kibana_react.mock';
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

const mockGetFilesClient = () => {
  const mockedFilesClient = createMockFilesClient() as unknown as DeeplyMockedKeys<
    ScopedFilesClient<unknown>
  >;

  mockedFilesClient.getFileKind.mockImplementation(() => ({
    id: 'test',
    maxSizeBytes: 10000,
    http: {},
  }));

  return () => mockedFilesClient;
};

export const mockedTestProvidersOwner = [SECURITY_SOLUTION_OWNER];

/** A utility for wrapping children in the providers required to run most tests */
const TestProvidersComponent: React.FC<TestProviderProps> = ({
  children,
  features,
  owner = mockedTestProvidersOwner,
  permissions = allCasesPermissions(),
  releasePhase = 'ga',
  externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry(),
  persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry(),
  license,
}) => {
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

  const getFilesClient = mockGetFilesClient();

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <MemoryRouter>
            <CasesProvider
              value={{
                externalReferenceAttachmentTypeRegistry,
                persistableStateAttachmentTypeRegistry,
                features,
                owner,
                permissions,
                getFilesClient,
              }}
            >
              <QueryClientProvider client={queryClient}>
                <FilesContext client={createMockFilesClient()}>{children}</FilesContext>
              </QueryClientProvider>
            </CasesProvider>
          </MemoryRouter>
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
  getFilesClient: () => ScopedFilesClient;
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
  owner = mockedTestProvidersOwner,
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

  const getFilesClient = mockGetFilesClient();

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <MemoryRouter>
            <CasesProvider
              value={{
                externalReferenceAttachmentTypeRegistry,
                persistableStateAttachmentTypeRegistry,
                features,
                owner,
                permissions,
                releasePhase,
                getFilesClient,
              }}
            >
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </CasesProvider>
          </MemoryRouter>
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
    getFilesClient,
  };
};
