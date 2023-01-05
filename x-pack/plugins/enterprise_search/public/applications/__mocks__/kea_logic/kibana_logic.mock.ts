/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { Capabilities } from '@kbn/core/public';

import { securityMock } from '@kbn/security-plugin/public/mocks';

import { mockHistory } from '../react_router/state.mock';

export const mockKibanaValues = {
  capabilities: {} as Capabilities,
  config: { host: 'http://localhost:3002' },
  charts: chartPluginMock.createStartContract(),
  cloud: {
    ...cloudMock.createSetup(),
    isCloudEnabled: false,
    deployment_url: 'https://cloud.elastic.co/deployments/some-id',
  },
  guidedOnboarding: {},
  history: mockHistory,
  isCloud: false,
  navigateToUrl: jest.fn(),
  productAccess: {
    hasAppSearchAccess: true,
    hasWorkplaceSearchAccess: true,
  },
  uiSettings: uiSettingsServiceMock.createStartContract(),
  security: securityMock.createStart(),
  setBreadcrumbs: jest.fn(),
  setChromeIsVisible: jest.fn(),
  setDocTitle: jest.fn(),
  renderHeaderActions: jest.fn(),
};

jest.mock('../../shared/kibana', () => ({
  KibanaLogic: { values: mockKibanaValues },
}));
