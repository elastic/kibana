/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { RecursivePartial } from '@elastic/eui/src/components/common';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';
import { EuiTheme } from '../../../../../../../src/plugins/kibana_react/common';
import { securityMock } from '../../../../../security/public/mocks';
import { spacesPluginMock } from '../../../../../spaces/public/mocks';
import { triggersActionsUiMock } from '../../../../../triggers_actions_ui/public/mocks';

export const createStartServicesMock = (): StartServices =>
  ({
    ...coreMock.createStart(),
    storage: { ...coreMock.createStorage(), remove: jest.fn() },
    lens: {
      canUseEditor: jest.fn(),
      navigateToPrefilledEditor: jest.fn(),
    },
    security: securityMock.createStart(),
    triggersActionsUi: triggersActionsUiMock.createStart(),
    spaces: spacesPluginMock.createStartContract(),
  } as unknown as StartServices);

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
