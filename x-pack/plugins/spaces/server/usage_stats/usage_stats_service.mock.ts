/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { usageStatsClientMock } from './usage_stats_client.mock';
import { UsageStatsServiceSetup } from './usage_stats_service';

const createSetupContractMock = (usageStatsClient = usageStatsClientMock.create()) => {
  const setupContract: jest.Mocked<UsageStatsServiceSetup> = {
    getClient: jest.fn().mockResolvedValue(usageStatsClient),
  };
  return setupContract;
};

export const usageStatsServiceMock = {
  createSetupContract: createSetupContractMock,
};
