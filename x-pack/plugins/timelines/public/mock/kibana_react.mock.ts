/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { RecursivePartial } from '@elastic/eui/src/components/common';
import { coreMock } from '../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { EuiTheme } from '../../../../../src/plugins/kibana_react/common';
import { CoreStart } from '../../../../../src/core/public';

export const mockGetCreateCaseFlyout = jest.fn();
export const mockGetAllCasesSelectorModal = jest.fn();
export const mockNavigateToApp = jest.fn();

export const createStartServicesMock = (): CoreStart => {
  const coreServices = coreMock.createStart();
  return {
    ...coreServices,
    cases: {
      getAllCases: jest.fn(),
      getCaseView: jest.fn(),
      getConfigureCases: jest.fn(),
      getCreateCase: jest.fn(),
      getRecentCases: jest.fn(),
      getCreateCaseFlyout: mockGetCreateCaseFlyout,
      getAllCasesSelectorModal: mockGetAllCasesSelectorModal,
    },
    application: {
      ...coreServices.application,
      navigateToApp: mockNavigateToApp,
    },
  } as unknown as CoreStart;
};

export const createWithKibanaMock = () => {
  const services = createStartServicesMock();

  // eslint-disable-next-line react/display-name
  return (Component: unknown) => (props: unknown) => {
    return React.createElement(Component as string, { ...(props as object), kibana: { services } });
  };
};

export const createKibanaContextProviderMock = () => {
  const services = createStartServicesMock();

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services }, children);
};

export const getMockTheme = (partialTheme: RecursivePartial<EuiTheme>): EuiTheme =>
  partialTheme as EuiTheme;
