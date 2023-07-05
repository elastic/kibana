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
import { serverlessMock } from '@kbn/serverless/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { securitySolutionMock } from '@kbn/security-solution-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import type { ProjectNavigationLink } from '../../navigation/links';
import type { Services } from '../services';

export const mockProjectNavLinks = jest.fn((): ProjectNavigationLink[] => []);

export const mockServices: Services = {
  ...coreMock.createStart(),
  serverless: serverlessMock.createStart(),
  security: securityMock.createStart(),
  securitySolution: securitySolutionMock.createStart(),
  getProjectNavLinks$: jest.fn(() => new BehaviorSubject(mockProjectNavLinks())),
  management: managementPluginMock.createStartContract(),
};

export const ServicesWrapper = React.memo(function ServicesWrapper({ children }) {
  return (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>{children}</KibanaContextProvider>
    </I18nProvider>
  );
});
