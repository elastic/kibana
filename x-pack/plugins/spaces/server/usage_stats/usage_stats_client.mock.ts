/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageStatsClient } from './usage_stats_client';

const createUsageStatsClientMock = () =>
  ({
    getUsageStats: jest.fn().mockResolvedValue({}),
    incrementCopySavedObjects: jest.fn().mockResolvedValue(null),
    incrementResolveCopySavedObjectsErrors: jest.fn().mockResolvedValue(null),
    incrementDisableLegacyUrlAliases: jest.fn().mockResolvedValue(null),
  }) as unknown as jest.Mocked<UsageStatsClient>;

export const usageStatsClientMock = {
  create: createUsageStatsClientMock,
};
