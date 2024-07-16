/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsOptimizationServerSetup, LogsOptimizationServerStart } from './types';

const createLogsOptimizationServerSetupMock = (): jest.Mocked<LogsOptimizationServerSetup> => ({});

const createLogsOptimizationServerStartMock = (): jest.Mocked<LogsOptimizationServerStart> => ({});

export const fieldsMetadataPluginServerMock = {
  createSetupContract: createLogsOptimizationServerSetupMock,
  createStartContract: createLogsOptimizationServerStartMock,
};
