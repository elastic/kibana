/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createLogViewsServiceSetupMock,
  createLogViewsServiceStartMock,
} from './services/log_views/log_views_service.mock';
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
    logViews: createLogViewsServiceStartMock(),
  };
  return infraStartMock;
};

export const infraPluginMock = {
  createSetupContract: createInfraSetupMock,
  createStartContract: createInfraStartMock,
};
