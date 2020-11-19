/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { chartPluginMock } from '../../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { featuresPluginMock } from '../../../../../features/public/mocks';

import { coreMock, scopedHistoryMock } from '../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUiServices } from '../../../application/app';
import { AlertTypeRegistryContract, ActionTypeRegistryContract } from '../../../types';

export const createStartServicesMock = (): TriggersAndActionsUiServices => {
  const core = coreMock.createStart();
  return {
    ...core,
    alertTypeRegistry: {
      has: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as AlertTypeRegistryContract,
    notifications: core.notifications,
    dataPlugin: jest.fn(),
    navigateToApp: jest.fn(),
    alerts: {
      getNavigation: jest.fn(async (id) =>
        id === 'alert-with-nav' ? { path: '/alert' } : undefined
      ),
    },
    history: scopedHistoryMock.create(),
    setBreadcrumbs: jest.fn(),
    data: dataPluginMock.createStartContract(),
    actionTypeRegistry: {
      has: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as ActionTypeRegistryContract,
    charts: chartPluginMock.createStartContract(),
    kibanaFeatures: [],
    element: ({
      style: { cursor: 'pointer' },
    } as unknown) as HTMLElement,
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
