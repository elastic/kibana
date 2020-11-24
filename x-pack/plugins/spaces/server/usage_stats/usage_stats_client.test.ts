/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import { SPACES_USAGE_STATS_TYPE } from './constants';
import { UsageStats } from './types';
import { CopyOptions, ResolveConflictsOptions } from '../lib/copy_to_spaces/types';
import { UsageStatsClient } from './usage_stats_client';

describe('UsageStatsClient', () => {
  const setup = () => {
    const debugLoggerMock = jest.fn();
    const repositoryMock = savedObjectsRepositoryMock.create();
    const usageStatsClient = new UsageStatsClient(debugLoggerMock, repositoryMock);
    return { usageStatsClient, debugLoggerMock, repositoryMock };
  };

  const createMockData = (attributes: UsageStats) => ({
    id: SPACES_USAGE_STATS_TYPE,
    type: SPACES_USAGE_STATS_TYPE,
    attributes,
    references: [],
  });

  const createOptions = { overwrite: true, id: SPACES_USAGE_STATS_TYPE };

  // mock data for existing fields
  const copySavedObjects = {
    total: 5,
    createNewCopies: { enabled: 2, disabled: 3 },
    overwrite: { enabled: 1, disabled: 4 },
  };
  const resolveCopySavedObjectsErrors = {
    total: 13,
    createNewCopies: { enabled: 6, disabled: 7 },
  };

  describe('#getUsageStats', () => {
    it('returns empty object when encountering a repository error', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockRejectedValue(new Error('Oh no!'));

      const result = await usageStatsClient.getUsageStats();
      expect(result).toEqual({});
    });

    it('returns object attributes when usageStats data exists', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      const attributes = { foo: 'bar' } as UsageStats;
      repositoryMock.get.mockResolvedValue(createMockData(attributes));

      const result = await usageStatsClient.getUsageStats();
      expect(result).toEqual(attributes);
    });
  });

  describe('#incrementCopySavedObjects', () => {
    it('creates fields if attributes are empty', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await usageStatsClient.incrementCopySavedObjects({} as CopyOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            copySavedObjects: {
              total: 1,
              createNewCopies: { enabled: 0, disabled: 1 },
              overwrite: { enabled: 0, disabled: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles createNewCopies=true / overwrite=true appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({ apiCalls: { copySavedObjects, resolveCopySavedObjectsErrors } })
      );

      await usageStatsClient.incrementCopySavedObjects({
        createNewCopies: true,
        overwrite: true,
      } as CopyOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            // these fields are changed
            copySavedObjects: {
              total: copySavedObjects.total + 1,
              createNewCopies: {
                enabled: copySavedObjects.createNewCopies.enabled + 1,
                disabled: copySavedObjects.createNewCopies.disabled,
              },
              overwrite: {
                enabled: copySavedObjects.overwrite.enabled + 1,
                disabled: copySavedObjects.overwrite.disabled,
              },
            },
            // these fields are unchanged
            resolveCopySavedObjectsErrors,
          },
        },
        createOptions
      );
    });
  });

  describe('#incrementResolveCopySavedObjectsErrors', () => {
    it('creates fields if attributes are empty', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await usageStatsClient.incrementResolveCopySavedObjectsErrors({} as ResolveConflictsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            resolveCopySavedObjectsErrors: {
              total: 1,
              createNewCopies: { enabled: 0, disabled: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles createNewCopies=true appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({ apiCalls: { copySavedObjects, resolveCopySavedObjectsErrors } })
      );

      await usageStatsClient.incrementResolveCopySavedObjectsErrors({
        createNewCopies: true,
      } as ResolveConflictsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            // these fields are changed
            resolveCopySavedObjectsErrors: {
              total: resolveCopySavedObjectsErrors.total + 1,
              createNewCopies: {
                enabled: resolveCopySavedObjectsErrors.createNewCopies.enabled + 1,
                disabled: resolveCopySavedObjectsErrors.createNewCopies.disabled,
              },
            },
            // these fields are unchanged
            copySavedObjects,
          },
        },
        createOptions
      );
    });
  });
});
