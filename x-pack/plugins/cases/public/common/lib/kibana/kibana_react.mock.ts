/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import type { PublicAppInfo } from '@kbn/core/public';
import type { RecursivePartial } from '@elastic/eui/src/components/common';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ILicense } from '@kbn/licensing-plugin/public';
import type { StartServices } from '../../../types';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { registerConnectorsToMockActionRegistry } from '../../mock/register_connectors';
import { connectorsMock } from '../../mock/connectors';

interface StartServiceArgs {
  license?: ILicense | null;
}

export const createStartServicesMock = ({ license }: StartServiceArgs = {}): StartServices => {
  const licensingPluginMock = licensingMock.createStart();

  const services = {
    ...coreMock.createStart(),
    storage: { ...coreMock.createStorage(), get: jest.fn(), set: jest.fn(), remove: jest.fn() },
    lens: {
      canUseEditor: jest.fn(),
      navigateToPrefilledEditor: jest.fn(),
    },
    security: securityMock.createStart(),
    triggersActionsUi: triggersActionsUiMock.createStart(),
    spaces: spacesPluginMock.createStartContract(),
    licensing:
      license != null
        ? { ...licensingPluginMock, license$: new BehaviorSubject(license) }
        : licensingPluginMock,
  } as unknown as StartServices;

  services.application.currentAppId$ = new BehaviorSubject<string>('testAppId');
  services.application.applications$ = new BehaviorSubject<Map<string, PublicAppInfo>>(
    new Map([['testAppId', { category: { label: 'Test' } } as unknown as PublicAppInfo]])
  );

  services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
    actionTypeTitle: '.servicenow',
    iconClass: 'logoSecurity',
  });

  registerConnectorsToMockActionRegistry(
    services.triggersActionsUi.actionTypeRegistry,
    connectorsMock
  );

  services.application.capabilities = {
    ...services.application.capabilities,
    actions: { save: true, show: true },
    generalCases: {
      create_cases: true,
      read_cases: true,
      update_cases: true,
      delete_cases: true,
      push_cases: true,
    },
    visualize: { save: true, show: true },
    dashboard: { show: true, createNew: true },
  };

  return services;
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

export const getMockTheme = (partialTheme: RecursivePartial<EuiTheme>): EuiTheme =>
  partialTheme as EuiTheme;
