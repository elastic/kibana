/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { telemetryClientMock } from '../lib/telemetry_client/telemetry_client.mock';
import { TelemetryServiceSetup } from './telemetry_service';

const createSetupContractMock = (telemetryClient = telemetryClientMock.create()) => {
  const setupContract: jest.Mocked<TelemetryServiceSetup> = {
    getClient: jest.fn().mockResolvedValue(telemetryClient),
  };
  return setupContract;
};

export const telemetryServiceMock = {
  createSetupContract: createSetupContractMock,
};
