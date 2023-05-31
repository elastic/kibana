/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/react';
import { coreMock } from '@kbn/core/public/mocks';
import { serverlessMock } from '@kbn/serverless/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { securitySolutionMock } from '@kbn/security-solution-plugin/public/mocks';

export const servicesMocks = {
  ...coreMock.createStart(),
  serverless: serverlessMock.createStart(),
  security: securityMock.createStart(),
  securitySolution: securitySolutionMock.createStart(),
};

export const KibanaServicesProvider = React.memo(({ children }) => (
  <I18nProvider>
    <KibanaContextProvider services={servicesMocks}>{children}</KibanaContextProvider>
  </I18nProvider>
));
