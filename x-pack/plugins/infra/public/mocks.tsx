/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createLocatorMock } from './locators/locators.mock';
import { createInventoryViewsServiceStartMock } from './services/inventory_views/inventory_views_service.mock';
import { createLogViewsServiceStartMock } from './services/log_views/log_views_service.mock';
import { createMetricsExplorerViewsServiceStartMock } from './services/metrics_explorer_views/metrics_explorer_views_service.mock';
import { createTelemetryServiceMock } from './services/telemetry/telemetry_service.mock';
import { InfraClientStartExports } from './types';

export const createInfraPluginStartMock = () => ({
  inventoryViews: createInventoryViewsServiceStartMock(),
  logViews: createLogViewsServiceStartMock(),
  metricsExplorerViews: createMetricsExplorerViewsServiceStartMock(),
  telemetry: createTelemetryServiceMock(),
  locators: createLocatorMock(),
  ContainerMetricsTable: () => <div />,
  HostMetricsTable: () => <div />,
  PodMetricsTable: () => <div />,
});

export const _ensureTypeCompatibility = (): InfraClientStartExports => createInfraPluginStartMock();
