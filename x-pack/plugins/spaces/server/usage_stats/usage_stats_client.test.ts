/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import { SPACES_USAGE_STATS_TYPE } from './constants';
import { UsageStats } from './types';
import {
  UsageStatsClient,
  IncrementCopySavedObjectsOptions,
  IncrementResolveCopySavedObjectsErrorsOptions,
} from './usage_stats_client';

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

  const firstPartyRequestHeaders = { 'kbn-version': 'a', origin: 'b', referer: 'c' }; // as long as these three header fields are truthy, this will be treated like a first-party request
  const createOptions = { overwrite: true, id: SPACES_USAGE_STATS_TYPE };

  // mock data for existing fields
  const copySavedObjects = {
    total: 5,
    kibanaRequest: { yes: 5, no: 0 },
    createNewCopiesEnabled: { yes: 2, no: 3 },
    overwriteEnabled: { yes: 1, no: 4 },
  };
  const resolveCopySavedObjectsErrors = {
    total: 13,
    kibanaRequest: { yes: 13, no: 0 },
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
    it('does not throw an error if repository create operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.create.mockRejectedValue(new Error('Oh no!'));

      await expect(
        usageStatsClient.incrementCopySavedObjects({} as IncrementCopySavedObjectsOptions)
      ).resolves.toBeUndefined();
      expect(repositoryMock.create).toHaveBeenCalled();
    });

    it('creates fields if attributes are empty', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await usageStatsClient.incrementCopySavedObjects({} as IncrementCopySavedObjectsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            copySavedObjects: {
              total: 1,
              kibanaRequest: { yes: 0, no: 1 },
              createNewCopiesEnabled: { yes: 0, no: 1 },
              overwriteEnabled: { yes: 0, no: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({ apiCalls: { copySavedObjects, resolveCopySavedObjectsErrors } })
      );

      await usageStatsClient.incrementCopySavedObjects({
        headers: firstPartyRequestHeaders,
        createNewCopies: true,
        overwrite: true,
      } as IncrementCopySavedObjectsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            // these fields are changed
            copySavedObjects: {
              total: copySavedObjects.total + 1,
              kibanaRequest: {
                yes: copySavedObjects.kibanaRequest.yes + 1,
                no: copySavedObjects.kibanaRequest.no,
              },
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
    it('does not throw an error if repository create operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.create.mockRejectedValue(new Error('Oh no!'));

      await expect(
        usageStatsClient.incrementResolveCopySavedObjectsErrors(
          {} as IncrementResolveCopySavedObjectsErrorsOptions
        )
      ).resolves.toBeUndefined();
      expect(repositoryMock.create).toHaveBeenCalled();
    });

    it('creates fields if attributes are empty', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await usageStatsClient.incrementResolveCopySavedObjectsErrors(
        {} as IncrementResolveCopySavedObjectsErrorsOptions
      );
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            resolveCopySavedObjectsErrors: {
              total: 1,
              kibanaRequest: { yes: 0, no: 1 },
              createNewCopiesEnabled: { yes: 0, no: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({ apiCalls: { copySavedObjects, resolveCopySavedObjectsErrors } })
      );

      await usageStatsClient.incrementResolveCopySavedObjectsErrors({
        headers: firstPartyRequestHeaders,
        createNewCopies: true,
      } as IncrementResolveCopySavedObjectsErrorsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        {
          apiCalls: {
            // these fields are changed
            resolveCopySavedObjectsErrors: {
              total: resolveCopySavedObjectsErrors.total + 1,
              kibanaRequest: {
                yes: resolveCopySavedObjectsErrors.kibanaRequest.yes + 1,
                no: resolveCopySavedObjectsErrors.kibanaRequest.no,
              },
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
