/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';

import { SPACES_USAGE_STATS_ID, SPACES_USAGE_STATS_TYPE } from './constants';
import type {
  IncrementCopySavedObjectsOptions,
  IncrementResolveCopySavedObjectsErrorsOptions,
} from './usage_stats_client';
import {
  COPY_STATS_PREFIX,
  DISABLE_LEGACY_URL_ALIASES_STATS_PREFIX,
  RESOLVE_COPY_STATS_PREFIX,
  UsageStatsClient,
} from './usage_stats_client';

describe('UsageStatsClient', () => {
  const setup = () => {
    const debugLoggerMock = jest.fn();
    const repositoryMock = savedObjectsRepositoryMock.create();
    const usageStatsClient = new UsageStatsClient(debugLoggerMock, Promise.resolve(repositoryMock));
    return { usageStatsClient, debugLoggerMock, repositoryMock };
  };

  const firstPartyRequestHeaders = { 'kbn-version': 'a', referer: 'b' }; // as long as these two header fields are truthy, this will be treated like a first-party request
  const incrementOptions = { refresh: false };

  describe('#getUsageStats', () => {
    it('calls repository.incrementCounter and initializes fields', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      await usageStatsClient.getUsageStats();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        [
          `${COPY_STATS_PREFIX}.total`,
          `${COPY_STATS_PREFIX}.kibanaRequest.yes`,
          `${COPY_STATS_PREFIX}.kibanaRequest.no`,
          `${COPY_STATS_PREFIX}.createNewCopiesEnabled.yes`,
          `${COPY_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${COPY_STATS_PREFIX}.overwriteEnabled.yes`,
          `${COPY_STATS_PREFIX}.overwriteEnabled.no`,
          `${RESOLVE_COPY_STATS_PREFIX}.total`,
          `${RESOLVE_COPY_STATS_PREFIX}.kibanaRequest.yes`,
          `${RESOLVE_COPY_STATS_PREFIX}.kibanaRequest.no`,
          `${RESOLVE_COPY_STATS_PREFIX}.createNewCopiesEnabled.yes`,
          `${RESOLVE_COPY_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${DISABLE_LEGACY_URL_ALIASES_STATS_PREFIX}.total`,
        ],
        { initialize: true }
      );
    });

    it('returns empty object when encountering a repository error', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const result = await usageStatsClient.getUsageStats();
      expect(result).toEqual({});
    });

    it('returns object attributes when usageStats data exists', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      const usageStats = { foo: 'bar' };
      repositoryMock.incrementCounter.mockResolvedValue({
        type: SPACES_USAGE_STATS_TYPE,
        id: SPACES_USAGE_STATS_ID,
        attributes: usageStats,
        references: [],
      });

      const result = await usageStatsClient.getUsageStats();
      expect(result).toEqual(usageStats);
    });
  });

  describe('#incrementCopySavedObjects', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      await expect(
        usageStatsClient.incrementCopySavedObjects({} as IncrementCopySavedObjectsOptions)
      ).resolves.toBeUndefined();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementCopySavedObjects({} as IncrementCopySavedObjectsOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        [
          `${COPY_STATS_PREFIX}.total`,
          `${COPY_STATS_PREFIX}.kibanaRequest.no`,
          `${COPY_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${COPY_STATS_PREFIX}.overwriteEnabled.no`,
        ],
        incrementOptions
      );
    });

    it('handles truthy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementCopySavedObjects({
        headers: firstPartyRequestHeaders,
        createNewCopies: true,
        overwrite: true,
      } as IncrementCopySavedObjectsOptions);
      await usageStatsClient.incrementCopySavedObjects({
        headers: firstPartyRequestHeaders,
        createNewCopies: false,
        overwrite: true,
      } as IncrementCopySavedObjectsOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(2);
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        1,
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        [
          `${COPY_STATS_PREFIX}.total`,
          `${COPY_STATS_PREFIX}.kibanaRequest.yes`,
          `${COPY_STATS_PREFIX}.createNewCopiesEnabled.yes`,
          // excludes 'overwriteEnabled.yes' and 'overwriteEnabled.no' when createNewCopies is true
        ],
        incrementOptions
      );
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        2,
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        [
          `${COPY_STATS_PREFIX}.total`,
          `${COPY_STATS_PREFIX}.kibanaRequest.yes`,
          `${COPY_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${COPY_STATS_PREFIX}.overwriteEnabled.yes`,
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementResolveCopySavedObjectsErrors', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      await expect(
        usageStatsClient.incrementResolveCopySavedObjectsErrors(
          {} as IncrementResolveCopySavedObjectsErrorsOptions
        )
      ).resolves.toBeUndefined();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementResolveCopySavedObjectsErrors(
        {} as IncrementResolveCopySavedObjectsErrorsOptions
      );
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        [
          `${RESOLVE_COPY_STATS_PREFIX}.total`,
          `${RESOLVE_COPY_STATS_PREFIX}.kibanaRequest.no`,
          `${RESOLVE_COPY_STATS_PREFIX}.createNewCopiesEnabled.no`,
        ],
        incrementOptions
      );
    });

    it('handles truthy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementResolveCopySavedObjectsErrors({
        headers: firstPartyRequestHeaders,
        createNewCopies: true,
      } as IncrementResolveCopySavedObjectsErrorsOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        [
          `${RESOLVE_COPY_STATS_PREFIX}.total`,
          `${RESOLVE_COPY_STATS_PREFIX}.kibanaRequest.yes`,
          `${RESOLVE_COPY_STATS_PREFIX}.createNewCopiesEnabled.yes`,
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementDisableLegacyUrlAliases', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      await expect(usageStatsClient.incrementDisableLegacyUrlAliases()).resolves.toBeUndefined();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
    });

    it('uses the appropriate counter fields', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementDisableLegacyUrlAliases();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        SPACES_USAGE_STATS_TYPE,
        SPACES_USAGE_STATS_ID,
        [`${DISABLE_LEGACY_URL_ALIASES_STATS_PREFIX}.total`],
        incrementOptions
      );
    });
  });
});
