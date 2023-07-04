/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { securitySolutionMock } from '@kbn/security-solution-plugin/public/mocks';
import type { Services } from './services';

export const servicesMocks: Services = {
  ...coreMock.createStart(),
  securitySolution: securitySolutionMock.createStart(),
};

export const KibanaServicesProvider: React.FC = ({ children }) => (
  <I18nProvider>
    <KibanaContextProvider services={servicesMocks}>{children}</KibanaContextProvider>
  </I18nProvider>
);
