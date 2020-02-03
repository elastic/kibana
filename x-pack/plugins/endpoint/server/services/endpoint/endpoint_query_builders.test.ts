/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, loggingServiceMock } from '../../../../../../src/core/server/mocks';
import { EndpointConfigSchema } from '../../config';
import {
  kibanaRequestToEndpointListQuery,
  kibanaRequestToEndpointFetchQuery,
} from './endpoint_query_builders';

describe('query builder', () => {
  describe('EndpointListQuery', () => {
    it('test default query params for all endpoints when no params or body is provided', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {},
      });
      const query = await kibanaRequestToEndpointListQuery(mockRequest, {
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      expect(query).toEqual({
        body: {
          query: {
            match_all: {},
          },
          collapse: {
            field: 'host.id.keyword',
            inner_hits: {
              name: 'most_recent',
              size: 1,
              sort: [{ 'event.created': 'desc' }],
            },
          },
          aggs: {
            total: {
              cardinality: {
                field: 'host.id.keyword',
              },
            },
          },
          sort: [
            {
              'event.created': {
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

  describe('test query builder with kql filter', () => {
    it('test default query params for all endpoints when no params or body is provided', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          filter: 'not host.ip:10.140.73.246',
        },
      });
      const query = await kibanaRequestToEndpointListQuery(mockRequest, {
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      expect(query).toEqual({
        body: {
          query: {
            bool: {
              must_not: {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'host.ip': '10.140.73.246',
                      },
                    },
                  ],
                },
              },
            },
          },
          collapse: {
            field: 'host.id.keyword',
            inner_hits: {
              name: 'most_recent',
              size: 1,
              sort: [{ 'event.created': 'desc' }],
            },
          },
          aggs: {
            total: {
              cardinality: {
                field: 'host.id.keyword',
              },
            },
          },
          sort: [
            {
              'event.created': {
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

  describe('EndpointFetchQuery', () => {
    it('searches for the correct ID', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const mockRequest = httpServerMock.createKibanaRequest({
        params: {
          id: mockID,
        },
      });
      const query = kibanaRequestToEndpointFetchQuery(mockRequest, {
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      expect(query).toEqual({
        body: {
          query: { match: { 'host.id.keyword': mockID } },
          sort: [{ 'event.created': { order: 'desc' } }],
          size: 1,
        },
        index: 'endpoint-agent*',
      });
    });
  });
});
