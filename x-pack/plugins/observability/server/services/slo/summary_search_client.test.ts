/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { Pagination } from '@kbn/slo-schema/src/models/pagination';
import {
  aHitFromSummaryIndex,
  aHitFromTempSummaryIndex,
  aSummaryDocument,
} from './fixtures/summary_search_document';
import { DefaultSummarySearchClient, Sort, SummarySearchClient } from './summary_search_client';

const defaultSort: Sort = {
  field: 'sli_value',
  direction: 'asc',
};
const defaultPagination: Pagination = {
  page: 1,
  perPage: 20,
};

describe('Summary Search Client', () => {
  let esClientMock: ElasticsearchClientMock;
  let service: SummarySearchClient;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    service = new DefaultSummarySearchClient(esClientMock, loggerMock.create(), 'some-space');
  });

  it('returns an empty response on error', async () => {
    esClientMock.count.mockRejectedValue(new Error('Cannot reach es'));

    await expect(service.search('', '', defaultSort, defaultPagination)).resolves
      .toMatchInlineSnapshot(`
      Object {
        "page": 1,
        "perPage": 20,
        "results": Array [],
        "total": 0,
      }
    `);
  });

  it('returns an empty response when the kql filter returns no document count', async () => {
    esClientMock.count.mockResolvedValue({
      count: 0,
      _shards: { failed: 0, successful: 1, total: 1 },
    });

    await expect(service.search('', '', defaultSort, defaultPagination)).resolves
      .toMatchInlineSnapshot(`
      Object {
        "page": 1,
        "perPage": 20,
        "results": Array [],
        "total": 0,
      }
    `);
  });

  it('returns the summary documents without duplicate temporary summary documents', async () => {
    const SLO_ID1 = 'slo-one';
    const SLO_ID2 = 'slo_two';
    const SLO_ID3 = 'slo-three';
    const SLO_ID4 = 'slo-four';
    const SLO_ID5 = 'slo-five';

    esClientMock.search.mockResolvedValue({
      took: 0,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 8,
          relation: 'eq',
        },
        max_score: 1,
        hits: [
          aHitFromSummaryIndex(aSummaryDocument({ id: SLO_ID1 })),
          aHitFromSummaryIndex(aSummaryDocument({ id: SLO_ID2 })),
          aHitFromSummaryIndex(aSummaryDocument({ id: SLO_ID3 })),
          aHitFromSummaryIndex(aSummaryDocument({ id: SLO_ID5 })), // no related temp doc
          aHitFromTempSummaryIndex(aSummaryDocument({ id: SLO_ID1, isTempDoc: true })), // removed as dup
          aHitFromTempSummaryIndex(aSummaryDocument({ id: SLO_ID2, isTempDoc: true })), // removed as dup
          aHitFromTempSummaryIndex(aSummaryDocument({ id: SLO_ID3, isTempDoc: true })), // removed as dup
          aHitFromTempSummaryIndex(aSummaryDocument({ id: SLO_ID4, isTempDoc: true })), // kept
        ],
      },
    });

    const results = await service.search('', '', defaultSort, defaultPagination);

    expect(esClientMock.deleteByQuery).toHaveBeenCalled();
    expect(esClientMock.deleteByQuery.mock.calls[0]).toMatchSnapshot();
    expect(results).toMatchSnapshot();
    expect(results.total).toBe(5);
  });
});
