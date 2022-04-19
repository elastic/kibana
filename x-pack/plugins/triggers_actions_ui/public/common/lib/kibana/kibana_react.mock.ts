/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { coreMock, scopedHistoryMock, themeServiceMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { TriggersAndActionsUiServices } from '../../../application/app';
import {
  RuleTypeRegistryContract,
  ActionTypeRegistryContract,
  AlertsTableConfigurationRegistryContract,
} from '../../../types';

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
    alertsTableConfigurationRegistry: {
      has: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as AlertsTableConfigurationRegistryContract,
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
