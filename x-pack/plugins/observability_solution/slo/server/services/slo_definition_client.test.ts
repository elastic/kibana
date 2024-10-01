/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { createSLO } from './fixtures/slo';
import { createSloContextMock, SLOContextMock } from './mocks';
import { SloDefinitionClient } from './slo_definition_client';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';

describe('SLODefinitionClient', () => {
  let sloDefinitionClient: SloDefinitionClient;
  let contextMock: jest.Mocked<SLOContextMock>;

  jest.useFakeTimers().setSystemTime(new Date('2024-01-01'));

  beforeEach(() => {
    contextMock = createSloContextMock();

    sloDefinitionClient = new SloDefinitionClient(contextMock);
  });

  describe('happy path', () => {
    it('fetches the SLO Definition from the SLO repository when no remoteName is specified', async () => {
      const slo = createSLO({ id: 'fixed-id' });
      contextMock.repository.findById.mockResolvedValueOnce(slo);

      const response = await sloDefinitionClient.execute('fixed-id', 'default');

      expect(response).toEqual({ slo });
    });

    it('fetches the SLO Definition from the remote summary index when a remoteName is specified', async () => {
      const slo = createSLO({ id: 'fixed-id' });
      const summaryDoc = createTempSummaryDocument(
        slo,
        'default',
        httpServiceMock.createStartContract().basePath
      );
      contextMock.esClient.search.mockResolvedValueOnce({
        took: 100,
        timed_out: false,
        _shards: {
          total: 0,
          successful: 0,
          skipped: 0,
          failed: 0,
        },
        hits: {
          hits: [{ _source: summaryDoc, _index: '', _id: '' }],
        },
      });

      const response = await sloDefinitionClient.execute('fixed-id', 'default', 'remote_cluster');

      expect(response).toMatchSnapshot();
      expect(contextMock.esClient.search.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "index": "remote_cluster:.slo-observability.summary-v3*",
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "term": Object {
                    "spaceId": "default",
                  },
                },
                Object {
                  "term": Object {
                    "slo.id": "fixed-id",
                  },
                },
              ],
            },
          },
        }
      `);
    });
  });
});
