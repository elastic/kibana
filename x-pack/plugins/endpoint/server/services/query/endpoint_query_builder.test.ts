/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock } from '../../../../../../src/core/server/http/http_server.mocks';

import { loggingServiceMock } from '../../../../../../src/core/server/logging/logging_service.mock';
import { EndpointConfigSchema } from '../../config';
import { elasticsearchServiceMock } from '../../../../../../src/core/server/elasticsearch/elasticsearch_service.mock';
import { EndpointQueryBuilder, endpointRequestSchema } from './endpoint_query_builder';
import { KibanaRequest } from '../../../../../../src/core/server/index';

describe('test query builder', () => {
  describe('test query builder request processing', () => {
    it('test query with no filter defaults', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {},
        params: { id: 'endpoint_id' },
      });
      const searchQueryBuilder = new EndpointQueryBuilder(mockRequest, {
        clusterClient: elasticsearchServiceMock.createClusterClient(),
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      const query = await searchQueryBuilder.toQuery();
      expect(query).toEqual({
        body: {
          query: {
            match_all: {},
          },
          collapse: {
            field: 'machine_id',
            inner_hits: {
              name: 'most_recent',
              size: 1,
              sort: [{ created_at: 'desc' }],
            },
          },
          aggs: {
            total: {
              cardinality: {
                field: 'machine_id',
              },
            },
          },
          sort: [
            {
              created_at: {
                order: 'desc',
              },
            },
          ],
        },
        from: 0,
        size: 10,
        index: 'endpoint-agent*',
      } as Record<string, any>);
    });

    it('test query with filter', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          filters: [
            {
              ip: 'ip',
            },
            {
              os: 'os',
            },
          ],
        },
      });
      const searchQueryBuilder = new EndpointQueryBuilder(mockRequest, {
        clusterClient: elasticsearchServiceMock.createClusterClient(),
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      const query = await searchQueryBuilder.toQuery();
      expect(query).toEqual({
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    'host.ip': 'ip',
                  },
                },
                {
                  match: {
                    'host.os.full': 'os',
                  },
                },
              ],
            },
          },
          collapse: {
            field: 'machine_id',
            inner_hits: {
              name: 'most_recent',
              size: 1,
              sort: [{ created_at: 'desc' }],
            },
          },
          aggs: {
            total: {
              cardinality: {
                field: 'machine_id',
              },
            },
          },
          sort: [
            {
              created_at: {
                order: 'desc',
              },
            },
          ],
        },
        from: 0,
        size: 10,
        index: 'endpoint-agent*',
      } as Record<string, any>);
    });
  });
  describe('test request schema', () => {
    it('test valid request with filters', () => {
      const request = httpServerMock.createRawRequest({
        payload: {
          filters: [
            {
              ip: 'ip_1',
            },
            {
              ip: 'ip_2',
            },
            {
              os: 'os_2',
            },
          ],
        },
      });
      const kibanaRequest = KibanaRequest.from(request, endpointRequestSchema);
      expect(kibanaRequest.body).toEqual({
        filters: [
          {
            ip: 'ip_1',
          },
          {
            ip: 'ip_2',
          },
          {
            os: 'os_2',
          },
        ],
      });
    });

    it('test valid request with no filters', () => {
      const request = httpServerMock.createRawRequest({});
      const kibanaRequest = KibanaRequest.from(request, endpointRequestSchema);
      expect(kibanaRequest.body).toEqual(null);
    });
  });
});
