/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import { getProfilingInitialized } from './get_profiling_initialized';

const createStatus = ({
  hasOtelData,
  hasUniversalProfilingData,
  hasUniversalProfilingSetup,
}: {
  hasOtelData: boolean;
  hasUniversalProfilingData: boolean;
  hasUniversalProfilingSetup: boolean;
}): ProfilingSchemasStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: hasOtelData },
  universalProfiling: {
    isAvailable: true,
    hasSetup: hasUniversalProfilingSetup,
    hasData: hasUniversalProfilingData,
    hasLegacyData: false,
  },
});

describe('getProfilingInitialized', () => {
  const getStatus = jest.fn();
  const profilingDataAccessStart = {
    services: { getStatus },
  } as unknown as ProfilingDataAccessPluginStart;
  const esClient = {} as IScopedClusterClient;
  const soClient = {} as SavedObjectsClientContract;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks the profiling status of both schemas in the space', async () => {
    getStatus.mockResolvedValue({ isEnabled: false });

    await getProfilingInitialized({
      profilingDataAccessStart,
      esClient,
      soClient,
      spaceId: 'my-space',
    });

    expect(getStatus).toHaveBeenCalledWith({ esClient, soClient, spaceId: 'my-space' });
  });

  it.each([
    [
      'there is only OpenTelemetry data',
      createStatus({
        hasOtelData: true,
        hasUniversalProfilingData: false,
        hasUniversalProfilingSetup: false,
      }),
      true,
    ],
    [
      'there is Universal Profiling data and it is set up',
      createStatus({
        hasOtelData: false,
        hasUniversalProfilingData: true,
        hasUniversalProfilingSetup: true,
      }),
      true,
    ],
    [
      'there is Universal Profiling data but it is not set up',
      createStatus({
        hasOtelData: false,
        hasUniversalProfilingData: true,
        hasUniversalProfilingSetup: false,
      }),
      false,
    ],
    [
      'there is no profiling data',
      createStatus({
        hasOtelData: false,
        hasUniversalProfilingData: false,
        hasUniversalProfilingSetup: true,
      }),
      false,
    ],
    ['profiling is disabled in Elasticsearch', { isEnabled: false } as const, false],
  ])('reports whether profiling can be shown when %s', async (_description, status, expected) => {
    getStatus.mockResolvedValue(status);

    await expect(
      getProfilingInitialized({ profilingDataAccessStart, esClient, soClient })
    ).resolves.toBe(expected);
  });
});
