/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROCESSOR_EVENT } from 'x-pack/plugins/apm/common/constants';
import { getBuckets } from '../get_buckets';

describe('timeseriesFetcher', () => {
  let clientSpy: jest.Mock;

  beforeEach(async () => {
    clientSpy = jest.fn().mockResolvedValueOnce({
      hits: {
        total: 100
      },
      aggregations: {
        distribution: {
          buckets: []
        }
      }
    });

    await getBuckets({
      serviceName: 'myServiceName',
      bucketSize: 10,
      setup: {
        start: 1528113600000,
        end: 1528977600000,
        client: clientSpy,
        config: {
          get: () => 'myIndex' as any
        }
      }
    });
  });

  it('should make the correct query', () => {
    expect(clientSpy.mock.calls).toMatchSnapshot();
  });

  it('should limit query results to error documents', () => {
    const query = clientSpy.mock.calls[0][1];
    expect(query.body.query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          term: {
            [PROCESSOR_EVENT]: 'error'
          }
        } as any
      ])
    );
  });
});
