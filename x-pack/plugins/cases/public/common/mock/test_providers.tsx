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
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
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

interface TestProviderProps {
  children: React.ReactNode;
  userCanCrud?: boolean;
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
  userCanCrud = true,
  releasePhase = 'ga',
}) => {
  return (
    <I18nProvider>
      <MockKibanaContextProvider>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <CasesProvider value={{ features, owner, userCanCrud }}>{children}</CasesProvider>
        </ThemeProvider>
      </MockKibanaContextProvider>
    </I18nProvider>
  );
};
TestProvidersComponent.displayName = 'TestProviders';

export const TestProviders = React.memo(TestProvidersComponent);

export interface AppMockRenderer {
  render: UiRender;
  coreStart: StartServices;
}

export const createAppMockRenderer = ({
  features,
  owner = [SECURITY_SOLUTION_OWNER],
  userCanCrud = true,
  releasePhase = 'ga',
}: Omit<TestProviderProps, 'children'> = {}): AppMockRenderer => {
  const services = createStartServicesMock();

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <CasesProvider value={{ features, owner, userCanCrud, releasePhase }}>
            {children}
          </CasesProvider>
        </ThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
  AppWrapper.displayName = 'AppWrapper';
  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper as React.ComponentType,
      ...options,
    });
  };
  return {
    coreStart: services,
    render,
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
