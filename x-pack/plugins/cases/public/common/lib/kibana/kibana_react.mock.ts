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

export const createStartServicesMock = (): StartServices =>
  (coreMock.createStart() as unknown) as StartServices;

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
