/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, loggingSystemMock } from '../../../../../../../src/core/server/mocks';
import { kibanaRequestToMetadataListESQuery, getESQueryHostMetadataByID } from './query_builders';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { metadataCurrentIndexPattern } from '../../../../common/endpoint/constants';
import { metadataQueryStrategyV2 } from './support/query_strategies';

describe('query builder', () => {
  describe('MetadataListESQuery', () => {
    it('test default query params for all endpoints metadata when no params or body is provided', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {},
      });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          logFactory: loggingSystemMock.create(),
          service: new EndpointAppContextService(),
          config: () => Promise.resolve(createMockConfig()),
        },
        metadataQueryStrategyV2()
      );
      expect(query).toEqual({
        body: {
          query: {
            match_all: {},
          },
          sort: [
            {
              'HostDetails.event.created': {
                order: 'desc',
              },
            },
          ],
          track_total_hits: true,
        },
        from: 0,
        size: 10,
        index: metadataCurrentIndexPattern,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as Record<string, any>);
    });

    it(
      'test default query params for all endpoints metadata when no params or body is provided ' +
        'with unenrolled host ids excluded',
      async () => {
        const unenrolledElasticAgentId = '1fdca33f-799f-49f4-939c-ea4383c77672';
        const mockRequest = httpServerMock.createKibanaRequest({
          body: {},
        });
        const query = await kibanaRequestToMetadataListESQuery(
          mockRequest,
          {
            logFactory: loggingSystemMock.create(),
            service: new EndpointAppContextService(),
            config: () => Promise.resolve(createMockConfig()),
          },
          metadataQueryStrategyV2(),
          {
            unenrolledAgentIds: [unenrolledElasticAgentId],
          }
        );

        expect(query).toEqual({
          body: {
            query: {
              bool: {
                must_not: {
                  terms: {
                    'HostDetails.elastic.agent.id': [unenrolledElasticAgentId],
                  },
                },
              },
            },
            sort: [
              {
                'HostDetails.event.created': {
                  order: 'desc',
                },
              },
            ],
            track_total_hits: true,
          },
          from: 0,
          size: 10,
          index: metadataCurrentIndexPattern,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as Record<string, any>);
      }
    );
  });

  describe('test query builder with kql filter', () => {
    it('test default query params for all endpoints metadata when body filter is provided', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          filters: { kql: 'not HostDetails.host.ip:10.140.73.246' },
        },
      });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          logFactory: loggingSystemMock.create(),
          service: new EndpointAppContextService(),
          config: () => Promise.resolve(createMockConfig()),
        },
        metadataQueryStrategyV2()
      );

      expect(query).toEqual({
        body: {
          query: {
            bool: {
              must: [
                {
                  bool: {
                    must_not: {
                      bool: {
                        should: [
                          {
                            match: {
                              'HostDetails.host.ip': '10.140.73.246',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  },
                },
              ],
            },
          },
          sort: [
            {
              'HostDetails.event.created': {
                order: 'desc',
              },
            },
          ],
          track_total_hits: true,
        },
        from: 0,
        size: 10,
        index: metadataCurrentIndexPattern,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as Record<string, any>);
    });

    it(
      'test default query params for all endpoints endpoint metadata excluding unerolled endpoint ' +
        'and when body filter is provided',
      async () => {
        const unenrolledElasticAgentId = '1fdca33f-799f-49f4-939c-ea4383c77672';
        const mockRequest = httpServerMock.createKibanaRequest({
          body: {
            filters: { kql: 'not HostDetails.host.ip:10.140.73.246' },
          },
        });
        const query = await kibanaRequestToMetadataListESQuery(
          mockRequest,
          {
            logFactory: loggingSystemMock.create(),
            service: new EndpointAppContextService(),
            config: () => Promise.resolve(createMockConfig()),
          },
          metadataQueryStrategyV2(),
          {
            unenrolledAgentIds: [unenrolledElasticAgentId],
          }
        );

        expect(query).toEqual({
          body: {
            query: {
              bool: {
                must: [
                  {
                    bool: {
                      must_not: {
                        terms: {
                          'HostDetails.elastic.agent.id': [unenrolledElasticAgentId],
                        },
                      },
                    },
                  },
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              match: {
                                'HostDetails.host.ip': '10.140.73.246',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    },
                  },
                ],
              },
            },
            sort: [
              {
                'HostDetails.event.created': {
                  order: 'desc',
                },
              },
            ],
            track_total_hits: true,
          },
          from: 0,
          size: 10,
          index: metadataCurrentIndexPattern,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as Record<string, any>);
      }
    );
  });

  describe('MetadataGetQuery', () => {
    it('searches for the correct ID', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const query = getESQueryHostMetadataByID(mockID, metadataQueryStrategyV2());

      expect(query).toEqual({
        body: {
          query: { match: { 'HostDetails.agent.id': mockID } },
          sort: [{ 'HostDetails.event.created': { order: 'desc' } }],
          size: 1,
        },
        index: metadataCurrentIndexPattern,
      });
    });
  });
});
