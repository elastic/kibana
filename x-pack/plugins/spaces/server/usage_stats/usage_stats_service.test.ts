/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, loggingSystemMock } from 'src/core/server/mocks';
import { UsageStatsService } from '.';
import { UsageStatsClient } from './usage_stats_client';
import { SPACES_USAGE_STATS_TYPE } from './constants';

describe('UsageStatsService', () => {
  const mockLogger = loggingSystemMock.createLogger();

  describe('#setup', () => {
    const setup = async () => {
      const core = coreMock.createSetup();
      const usageStatsService = await new UsageStatsService(mockLogger).setup(core);
      return { core, usageStatsService };
    };

    it('creates internal repository', async () => {
      const { core } = await setup();

      const [{ savedObjects }] = await core.getStartServices();
      expect(savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
      expect(savedObjects.createInternalRepository).toHaveBeenCalledWith([SPACES_USAGE_STATS_TYPE]);
    });

    describe('#getClient', () => {
      it('returns client', async () => {
        const { usageStatsService } = await setup();

        const usageStatsClient = await usageStatsService.getClient();
        expect(usageStatsClient).toBeInstanceOf(UsageStatsClient);
      });
    });
  });
});
