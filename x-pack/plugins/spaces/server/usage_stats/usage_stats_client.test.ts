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
    createNewCopiesEnabled: { yes: 2, no: 3 },
    overwriteEnabled: { yes: 1, no: 4 },
  };
  const resolveCopySavedObjectsErrors = {
    total: 13,
    createNewCopiesEnabled: { yes: 6, no: 7 },
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
              createNewCopiesEnabled: { yes: 0, no: 1 },
              overwriteEnabled: { yes: 0, no: 1 },
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
              createNewCopiesEnabled: {
                yes: copySavedObjects.createNewCopiesEnabled.yes + 1,
                no: copySavedObjects.createNewCopiesEnabled.no,
              },
              overwriteEnabled: {
                yes: copySavedObjects.overwriteEnabled.yes + 1,
                no: copySavedObjects.overwriteEnabled.no,
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
              createNewCopiesEnabled: { yes: 0, no: 1 },
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
              createNewCopiesEnabled: {
                yes: resolveCopySavedObjectsErrors.createNewCopiesEnabled.yes + 1,
                no: resolveCopySavedObjectsErrors.createNewCopiesEnabled.no,
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
