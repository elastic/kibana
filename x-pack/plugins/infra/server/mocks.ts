/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInventoryViewsServiceStartMock } from './services/inventory_views/inventory_views_service.mock';
import {
  createLogViewsServiceSetupMock,
  createLogViewsServiceStartMock,
} from './services/log_views/log_views_service.mock';
import { createMetricsExplorerViewsServiceStartMock } from './services/metrics_explorer_views/metrics_explorer_views_service.mock';
import { InfraPluginSetup, InfraPluginStart } from './types';

const createInfraSetupMock = () => {
  const infraSetupMock: jest.Mocked<InfraPluginSetup> = {
    defineInternalSourceConfiguration: jest.fn(),
    logViews: createLogViewsServiceSetupMock(),
  };

  return infraSetupMock;
};

const createInfraStartMock = () => {
  const infraStartMock: jest.Mocked<InfraPluginStart> = {
    getMetricIndices: jest.fn(),
    inventoryViews: createInventoryViewsServiceStartMock(),
    logViews: createLogViewsServiceStartMock(),
    metricsExplorerViews: createMetricsExplorerViewsServiceStartMock(),
  };
  return infraStartMock;
};

export const infraPluginMock = {
  createSetupContract: createInfraSetupMock,
  createStartContract: createInfraStartMock,
};
