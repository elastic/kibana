/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getCasesSystemActionData } from './case_system_action';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('casesSystemAction', () => {
  const logger = loggingSystemMock.createLogger();

  describe('getCasesSystemActionData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

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
      const res = await getCasesSystemActionData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res).toEqual({ totalCasesCreated: 4, totalRules: 2 });
    });

    it('calculates the metrics correctly with no aggregations', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [],
        per_page: 1,
        page: 1,
      });

      const res = await getCasesSystemActionData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(res).toEqual({ totalCasesCreated: 0, totalRules: 0 });
    });

    it('should call find with correct arguments', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [],
        per_page: 1,
        page: 1,
      });

      await getCasesSystemActionData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(savedObjectsClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "aggs": Object {
            "counterSum": Object {
              "sum": Object {
                "field": "cases-rules.attributes.counter",
              },
            },
            "totalRules": Object {
              "cardinality": Object {
                "field": "cases-rules.attributes.rules.id",
              },
            },
          },
          "namespaces": Array [
            "*",
          ],
          "page": 1,
          "perPage": 1,
          "type": "cases-rules",
        }
      `);
    });
  });
});
