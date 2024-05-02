/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getCasesSystemActionData } from './case_system_action';

describe('casesSystemAction', () => {
  const logger = loggingSystemMock.createLogger();

  describe('getCasesSystemActionData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();

    beforeEach(() => {
      jest.clearAllMocks();
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [],
        per_page: 1,
        page: 1,
        aggregations: { counterSum: { value: 4 }, totalRules: { value: 2 } },
      });
    });

    it('calculates the metrics correctly', async () => {
      const res = await getCasesSystemActionData({ savedObjectsClient, logger });
      expect(res).toEqual({ totalCasesCreated: 4, totalRules: 2 });
    });

    it('calculates the metrics correctly with no aggregations', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [],
        per_page: 1,
        page: 1,
      });

      const res = await getCasesSystemActionData({ savedObjectsClient, logger });
      expect(res).toEqual({ totalCasesCreated: 0, totalRules: 0 });
    });
  });
});
