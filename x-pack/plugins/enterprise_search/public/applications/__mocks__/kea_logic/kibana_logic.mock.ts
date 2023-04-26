/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { ApplicationStart, Capabilities } from '@kbn/core/public';

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

import { LensPublicStart } from '@kbn/lens-plugin/public';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { mockHistory } from '../react_router/state.mock';

export const mockKibanaValues = {
  application: {
    getUrlForApp: jest.fn(
      (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path}`
    ),
  } as unknown as ApplicationStart,
  capabilities: {} as Capabilities,
  charts: chartPluginMock.createStartContract(),
  cloud: {
    ...cloudMock.createSetup(),
    deployment_url: 'https://cloud.elastic.co/deployments/some-id',
    isCloudEnabled: false,
  },
  config: { host: 'http://localhost:3002' },
  data: dataPluginMock.createStartContract(),
  guidedOnboarding: {},
  history: mockHistory,
  isCloud: false,
  lens: {
    EmbeddableComponent: jest.fn(),
    stateHelperApi: jest.fn().mockResolvedValue({
      formula: jest.fn(),
    }),
  } as unknown as LensPublicStart,
  navigateToUrl: jest.fn(),
  productAccess: {
    hasAppSearchAccess: true,
    hasWorkplaceSearchAccess: true,
  },
  productFeatures: {
    hasNativeConnectors: true,
    hasWebCrawler: true,
  },
  renderHeaderActions: jest.fn(),
  security: securityMock.createStart(),
  setBreadcrumbs: jest.fn(),
  setChromeIsVisible: jest.fn(),
  setDocTitle: jest.fn(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
};

jest.mock('../../shared/kibana', () => ({
  KibanaLogic: { values: mockKibanaValues },
}));
