/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskEngineDataClient } from './risk_engine_data_client';

const createRiskEngineDataClientMock = () =>
  ({
    disableLegacyRiskEngine: jest.fn(),
    disableRiskEngine: jest.fn(),
    enableRiskEngine: jest.fn(),
    getConfiguration: jest.fn(),
    getRiskInputsIndex: jest.fn(),
    getStatus: jest.fn(),
    getWriter: jest.fn(),
    init: jest.fn(),
    initializeResources: jest.fn(),
  } as unknown as jest.Mocked<RiskEngineDataClient>);

export const riskEngineDataClientMock = { create: createRiskEngineDataClientMock };
