/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  elasticsearchClientMock,
  ElasticsearchClientMock,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '@kbn/core/server/elasticsearch/client/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaRequest } from '@kbn/core/server/http/router/request';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import {
  defineFindingsIndexRoute,
  findingsInputSchema,
  DEFAULT_FINDINGS_PER_PAGE,
} from './findings';

export const getMockCspContext = (mockEsClient: ElasticsearchClientMock): KibanaRequest => {
  return {
    core: {
      elasticsearch: {
        client: { asCurrentUser: mockEsClient },
      },
    },
    fleet: { authz: { fleet: { all: true } } },
  } as unknown as KibanaRequest;
};

describe('findings API', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineFindingsIndexRoute(router, cspContext);

    const [config, _] = router.get.mock.calls[0];

    expect(config.path).toEqual('/api/csp/findings');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineFindingsIndexRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineFindingsIndexRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: false } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(1);
  });

  describe('test input schema', () => {
    it('expect to find default values', async () => {
      const validatedQuery = findingsInputSchema.validate({});

      expect(validatedQuery).toMatchObject({
        page: 1,
        per_page: DEFAULT_FINDINGS_PER_PAGE,
        sort_order: expect.stringMatching('desc'),
      });
    });

    it('should throw when page field is not a positive integer', async () => {
      expect(() => {
        findingsInputSchema.validate({ page: -2 });
      }).toThrow();
    });

    it('should throw when per_page field is not a positive integer', async () => {
      expect(() => {
        findingsInputSchema.validate({ per_page: -2 });
      }).toThrow();
    });

    it('should throw when latest_run is not a boolean', async () => {
      expect(() => {
        findingsInputSchema.validate({ latest_cycle: 'some string' }); // expects to get boolean
      }).toThrow();
    });

    it('should not throw when latest_run is a boolean', async () => {
      expect(() => {
        findingsInputSchema.validate({ latest_cycle: true });
      }).not.toThrow();
    });

    it('should throw when sort_field is not string', async () => {
      expect(() => {
        findingsInputSchema.validate({ sort_field: true });
      }).toThrow();
    });

    it('should not throw when sort_field is a string', async () => {
      expect(() => {
        findingsInputSchema.validate({ sort_field: 'field1' });
      }).not.toThrow();
    });

    it('should throw when sort_order is not `asc` or `desc`', async () => {
      expect(() => {
        findingsInputSchema.validate({ sort_order: 'Other Direction' });
      }).toThrow();
    });

    it('should not throw when `asc` is input for sort_order field', async () => {
      expect(() => {
        findingsInputSchema.validate({ sort_order: 'asc' });
      }).not.toThrow();
    });

    it('should not throw when `desc` is input for sort_order field', async () => {
      expect(() => {
        findingsInputSchema.validate({ sort_order: 'desc' });
      }).not.toThrow();
    });

    it('should throw when fields is not string', async () => {
      expect(() => {
        findingsInputSchema.validate({ fields: ['field1', 'field2'] });
      }).toThrow();
    });

    it('should not throw when fields is a string', async () => {
      expect(() => {
        findingsInputSchema.validate({ sort_field: 'field1, field2' });
      }).not.toThrow();
    });
  });

  describe('test query building', () => {
    it('takes cycle_id and validate the filter was built right', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();

      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };
      defineFindingsIndexRoute(router, cspContext);

      const [_, handler] = router.get.mock.calls[0];
      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { latest_cycle: true },
      });

      mockEsClient.search.mockResolvedValueOnce(
        // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
        {
          aggregations: {
            group: {
              buckets: [
                {
                  group_docs: {
                    hits: {
                      hits: [{ fields: { 'cycle_id.keyword': ['randomId1'] } }],
                    },
                  },
                },
              ],
            },
          },
        }
      );

      const [context, req, res] = [mockContext, mockRequest, mockResponse];

      await handler(context, req, res);

      expect(mockEsClient.search).toHaveBeenCalledTimes(2);

      const handlerArgs = mockEsClient.search.mock.calls[1][0];

      expect(handlerArgs).toMatchObject({
        query: {
          bool: {
            filter: [{ terms: { 'cycle_id.keyword': ['randomId1'] } }],
          },
        },
      });
    });

    it('validate that default sort is timestamp desc', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();

      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };
      defineFindingsIndexRoute(router, cspContext);

      const [_, handler] = router.get.mock.calls[0];
      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          sort_order: 'desc',
        },
      });

      const [context, req, res] = [mockContext, mockRequest, mockResponse];

      await handler(context, req, res);

      const handlerArgs = mockEsClient.search.mock.calls[0][0];

      expect(handlerArgs).toMatchObject({
        sort: [{ '@timestamp': { order: 'desc' } }],
      });
    });

    it('should build sort request by `sort_field` and `sort_order` - asc', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();

      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };
      defineFindingsIndexRoute(router, cspContext);

      const [_, handler] = router.get.mock.calls[0];
      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          sort_field: 'agent.id',
          sort_order: 'asc',
        },
      });

      const [context, req, res] = [mockContext, mockRequest, mockResponse];

      await handler(context, req, res);

      const handlerArgs = mockEsClient.search.mock.calls[0][0];

      expect(handlerArgs).toMatchObject({
        sort: [{ 'agent.id': 'asc' }],
      });
    });

    it('should build sort request by `sort_field` and `sort_order` - desc', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();

      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };
      defineFindingsIndexRoute(router, cspContext);

      const [_, handler] = router.get.mock.calls[0];
      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          sort_field: 'agent.id',
          sort_order: 'desc',
        },
      });

      const [context, req, res] = [mockContext, mockRequest, mockResponse];

      await handler(context, req, res);

      const handlerArgs = mockEsClient.search.mock.calls[0][0];

      expect(handlerArgs).toMatchObject({
        sort: [{ 'agent.id': 'desc' }],
      });
    });

    it('takes `page` number and `per_page` validate that the requested selected page was called', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();

      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };
      defineFindingsIndexRoute(router, cspContext);

      const [_, handler] = router.get.mock.calls[0];
      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          per_page: 10,
          page: 3,
        },
      });

      const [context, req, res] = [mockContext, mockRequest, mockResponse];
      await handler(context, req, res);

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      const handlerArgs = mockEsClient.search.mock.calls[0][0];

      expect(handlerArgs).toMatchObject({
        from: 20,
        size: 10,
      });
    });

    it('should format request by fields filter', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();

      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };
      defineFindingsIndexRoute(router, cspContext);

      const [_, handler] = router.get.mock.calls[0];

      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          fields: 'field1,field2,field3',
        },
      });

      const [context, req, res] = [mockContext, mockRequest, mockResponse];

      await handler(context, req, res);

      const handlerArgs = mockEsClient.search.mock.calls[0][0];

      expect(handlerArgs).toMatchObject({
        _source: ['field1', 'field2', 'field3'],
      });
    });

    it('takes dslQuery and validate the conversion to esQuery filter', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();
      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };

      defineFindingsIndexRoute(router, cspContext);

      const [_, handler] = router.get.mock.calls[0];
      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          kquery: 'result.evaluation.keyword:failed',
        },
      });

      const [context, req, res] = [mockContext, mockRequest, mockResponse];

      await handler(context, req, res);
      const handlerArgs = mockEsClient.search.mock.calls[0][0];

      expect(handlerArgs).toMatchObject({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [{ match: { 'result.evaluation.keyword': 'failed' } }],
                },
              },
            ],
          },
        },
      });
    });

    it('takes dslQuery and latest_cycle filter validate the conversion to esQuery filter', async () => {
      const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
      const router = httpServiceMock.createRouter();
      const cspAppContextService = new CspAppService();
      const cspContext: CspAppContext = {
        logger,
        service: cspAppContextService,
      };

      defineFindingsIndexRoute(router, cspContext);
      const [_, handler] = router.get.mock.calls[0];

      const mockContext = getMockCspContext(mockEsClient);
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          kquery: 'result.evaluation.keyword:failed',
          latest_cycle: true,
        },
      });

      mockEsClient.search.mockResolvedValueOnce(
        // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
        {
          aggregations: {
            group: {
              buckets: [
                {
                  group_docs: {
                    hits: {
                      hits: [{ fields: { 'cycle_id.keyword': ['randomId1'] } }],
                    },
                  },
                },
              ],
            },
          },
        }
      );

      const [context, req, res] = [mockContext, mockRequest, mockResponse];

      await handler(context, req, res);

      const handlerArgs = mockEsClient.search.mock.calls[1][0];
      // console.log(handlerArgs.query.bool);
      expect(handlerArgs).toMatchObject({
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [{ match: { 'result.evaluation.keyword': 'failed' } }],
                  minimum_should_match: 1,
                },
              },
              { terms: { 'cycle_id.keyword': ['randomId1'] } },
            ],
          },
        },
      });
    });
  });
});
