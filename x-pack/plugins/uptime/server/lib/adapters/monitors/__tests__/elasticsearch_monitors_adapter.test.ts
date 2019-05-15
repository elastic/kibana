/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from '../../database';
import { ElasticsearchMonitorsAdapter } from '../elasticsearch_monitors_adapter';

// FIXME: there are many untested functions in this adapter. They should be tested.
describe('ElasticsearchMonitorsAdapter', () => {
  it('will return kubernetes information if contained in hits', async () => {
    expect.assertions(2);

    const mockHits = [
      {
        _source: {
          '@timestamp': '2018-10-30T18:51:59.800Z',
          container: {
            id: 'container_id',
          },
          kubernetes: {
            pod: {
              uid: 'kubernetes_pod_uid',
            },
          },
          monitor: {
            status: 'up',
          },
        },
      },
    ];
    const mockEsQueryResult = {
      aggregations: {
        hosts: {
          buckets: [
            {
              key: {
                id: 'foo',
                url: 'bar',
              },
              latest: {
                hits: {
                  hits: mockHits,
                },
              },
              histogram: {
                buckets: [],
              },
            },
          ],
        },
      },
    };

    const database: DatabaseAdapter = {
      search: async (request: any, params: any) => mockEsQueryResult,
      count: async (request: any, params: any) => null,
    };
    const adapter = new ElasticsearchMonitorsAdapter(database);
    const result = await adapter.getMonitors({}, 'now-15m', 'now');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchSnapshot();
  });
});
