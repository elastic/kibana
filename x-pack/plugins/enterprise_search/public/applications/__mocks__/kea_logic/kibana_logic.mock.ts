/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';

import { securityMock } from '@kbn/security-plugin/public/mocks';

import { mockHistory } from '../react_router/state.mock';

export const mockKibanaValues = {
  config: { host: 'http://localhost:3002' },
  charts: chartPluginMock.createStartContract(),
  cloud: {
    isCloudEnabled: false,
    deployment_url: 'https://cloud.elastic.co/deployments/some-id',
  },
  history: mockHistory,
  navigateToUrl: jest.fn(),
  security: securityMock.createStart(),
  setBreadcrumbs: jest.fn(),
  setChromeIsVisible: jest.fn(),
  setDocTitle: jest.fn(),
  renderHeaderActions: jest.fn(),
};

jest.mock('../../shared/kibana', () => ({
  KibanaLogic: { values: mockKibanaValues },
}));
