/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUiServices } from '../../../application/app';
import { ValidationResult } from '../../../types';

export const createStartServicesMock = (): TriggersAndActionsUiServices => {
  const core = coreMock.createStart();
  return ({
    ...core,
    alertTypeRegistry: {
      has: jest.fn().mockReturnValue(true),
      register: jest.fn(),
      get: jest.fn().mockReturnValue({
        id: 'my-alert-type',
        iconClass: 'test',
        name: 'test-alert',
        validate: (): ValidationResult => {
          return { errors: {} };
        },
        requiresAppContext: false,
      }),
      actionTypeRegistry: jest.fn(),
      list: jest.fn(),
    },
    capabilities: {
      get: jest.fn(() => ({})),
    },
    toastNotifications: core.notifications.toasts,
    dataPlugin: jest.fn(),
    navigateToApp: jest.fn(),
    alerts: {
      getNavigation: jest.fn(async (id) =>
        id === 'alert-with-nav' ? { path: '/alert' } : undefined
      ),
    },
  } as unknown) as TriggersAndActionsUiServices;
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
