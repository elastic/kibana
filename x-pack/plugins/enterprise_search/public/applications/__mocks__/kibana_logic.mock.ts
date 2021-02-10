/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '../../../../../../src/plugins/charts/public/mocks';

import { mockHistory } from './';

export const mockKibanaValues = {
  config: { host: 'http://localhost:3002' },
  charts: chartPluginMock.createStartContract(),
  cloud: {
    isCloudEnabled: false,
    cloudDeploymentUrl: 'https://cloud.elastic.co/deployments/some-id',
  },
  history: mockHistory,
  navigateToUrl: jest.fn(),
  setBreadcrumbs: jest.fn(),
  setDocTitle: jest.fn(),
  renderHeaderActions: jest.fn(),
};

jest.mock('../shared/kibana', () => ({
  KibanaLogic: { values: mockKibanaValues },
}));
