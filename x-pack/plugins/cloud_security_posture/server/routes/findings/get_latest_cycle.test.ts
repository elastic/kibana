/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchClientMock,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from 'src/core/server/elasticsearch/client/mocks';
import { loggingSystemMock } from 'src/core/server/mocks';
import { getLatestCycleIds } from './get_latest_cycle_ids';

const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

describe('get latest cycle ids', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.resetAllMocks();
  });

  it('expect to find empty bucket', async () => {
    mockEsClient.search.mockResolvedValueOnce(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          group: {
            buckets: [{}],
          },
        },
      })
    );
    const response = await getLatestCycleIds(mockEsClient, logger);
    expect(response).toEqual(undefined);
  });

  it('expect to find 1 cycle id', async () => {
    mockEsClient.search.mockResolvedValueOnce(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          group: {
            buckets: [
              {
                group_docs: {
                  hits: {
                    hits: [{ fields: { 'run_id.keyword': ['randomId1'] } }],
                  },
                },
              },
            ],
          },
        },
      })
    );
    const response = await getLatestCycleIds(mockEsClient, logger);
    expect(response).toEqual(expect.arrayContaining(['randomId1']));
  });

  it('expect to find multiple cycle ids', async () => {
    mockEsClient.search.mockResolvedValueOnce(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          group: {
            buckets: [
              {
                group_docs: {
                  hits: {
                    hits: [{ fields: { 'run_id.keyword': ['randomId1'] } }],
                  },
                },
              },
              {
                group_docs: {
                  hits: {
                    hits: [{ fields: { 'run_id.keyword': ['randomId2'] } }],
                  },
                },
              },
              {
                group_docs: {
                  hits: {
                    hits: [{ fields: { 'run_id.keyword': ['randomId3'] } }],
                  },
                },
              },
            ],
          },
        },
      })
    );
    const response = await getLatestCycleIds(mockEsClient, logger);
    expect(response).toEqual(expect.arrayContaining(['randomId1', 'randomId2', 'randomId3']));
  });
});
