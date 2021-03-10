/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { coreMock } from '../../../../../../src/core/public/mocks';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context';

export const createStartServicesMock = (): CoreStart => {
  const core = coreMock.createStart();
  return (core as unknown) as CoreStart;
};
export const createKibanaContextProviderMock = () => {
  const services = coreMock.createStart();

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services }, children);
};
