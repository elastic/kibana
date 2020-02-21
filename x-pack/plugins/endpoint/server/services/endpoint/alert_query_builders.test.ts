/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, loggingServiceMock } from 'src/core/server/mocks';
import { EndpointConfigSchema } from '../../config';
import { getPagingProperties, buildAlertListESQuery } from './alert_query_builders';

describe('test query builder', () => {
  describe('test query builder request processing', () => {
    it('should execute the correct Elasticsearch query for a default request', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({});
      const mockCtx = {
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      };
      const queryParams = await getPagingProperties(mockRequest, mockCtx);
      const query = buildAlertListESQuery(queryParams);

      expect(query).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "query": Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "match": Object {
                      "event.kind": "alert",
                    },
                  },
                ],
              },
            },
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "desc",
                },
              },
            ],
            "track_total_hits": 10000,
          },
          "from": 0,
          "index": "my-index",
          "size": 10,
        }
      `);
    });
    it('should adjust track_total_hits for deep pagination', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          page_index: 10,
          page_size: 1000,
        },
      });
      const mockCtx = {
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      };
      const queryParams = await getPagingProperties(mockRequest, mockCtx);
      const query = buildAlertListESQuery(queryParams);

      expect(query).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "query": Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "match": Object {
                      "event.kind": "alert",
                    },
                  },
                ],
              },
            },
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "desc",
                },
              },
            ],
            "track_total_hits": 12000,
          },
          "from": 10000,
          "index": "my-index",
          "size": 1000,
        }
      `);
    });
  });
});
