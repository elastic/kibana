/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, loggingServiceMock } from '../../../../../../src/core/server/mocks';
import { EndpointConfigSchema } from '../../config';
import { kibanaRequestToEndpointListQuery } from './endpoint_query_builders';

describe('test query builder', () => {
  describe('test query builder request processing', () => {
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
});
