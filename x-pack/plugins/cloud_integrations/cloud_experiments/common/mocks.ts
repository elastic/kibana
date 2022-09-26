/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudExperimentsPluginSetup, CloudExperimentsPluginStart } from './types';

function createStartMock(): jest.Mocked<CloudExperimentsPluginStart> {
  return {
    getVariation: jest.fn(),
    reportMetric: jest.fn(),
  };
}

function createSetupMock(): jest.Mocked<CloudExperimentsPluginSetup> {
  return {
    identifyUser: jest.fn(),
  };
}

export const cloudExperimentsMock = {
  createSetupMock,
  createStartMock,
};
