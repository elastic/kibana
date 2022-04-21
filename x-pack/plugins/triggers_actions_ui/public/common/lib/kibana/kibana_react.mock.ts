/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { chartPluginMock } from '../../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { dataViewPluginMocks } from '../../../../../../../src/plugins/data_views/public/mocks';
import { unifiedSearchPluginMock } from '../../../../../../../src/plugins/unified_search/public/mocks';
import {
  coreMock,
  scopedHistoryMock,
  themeServiceMock,
} from '../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUiServices } from '../../../application/app';
import { RuleTypeRegistryContract, ActionTypeRegistryContract } from '../../../types';

export const createStartServicesMock = (): TriggersAndActionsUiServices => {
  const core = coreMock.createStart();
  return {
    ...core,
    ruleTypeRegistry: {
      has: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as RuleTypeRegistryContract,
    dataPlugin: jest.fn(),
    navigateToApp: jest.fn(),
    alerting: {
      getNavigation: jest.fn(async (id) =>
        id === 'alert-with-nav' ? { path: '/alert' } : undefined
      ),
    },
    history: scopedHistoryMock.create(),
    setBreadcrumbs: jest.fn(),
    data: dataPluginMock.createStartContract(),
    dataViews: dataViewPluginMocks.createStartContract(),
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    actionTypeRegistry: {
      has: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as ActionTypeRegistryContract,
    charts: chartPluginMock.createStartContract(),
    isCloud: false,
    kibanaFeatures: [],
    element: {
      style: { cursor: 'pointer' },
    } as unknown as HTMLElement,
    theme$: themeServiceMock.createTheme$(),
  } as TriggersAndActionsUiServices;
};

export const createWithKibanaMock = () => {
  const services = createStartServicesMock();

  return (Component: unknown) => (props: unknown) => {
    return React.createElement(Component as string, { ...(props as object), kibana: { services } });
  };
};

export const createKibanaContextProviderMock = () => {
  const services = createStartServicesMock();

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services }, children);
};
