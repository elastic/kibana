/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { setupRequest } from './setup_request';
import { APMConfig } from '../..';
import { APMRequestHandlerContext } from '../../routes/typings';
import { KibanaRequest } from '../../../../../../src/core/server';
import { ProcessorEvent } from '../../../common/processor_event';
import { PROCESSOR_EVENT } from '../../../common/elasticsearch_fieldnames';

jest.mock('../settings/apm_indices/get_apm_indices', () => ({
  getApmIndices: async () => ({
    'apm_oss.sourcemapIndices': 'apm-*',
    'apm_oss.errorIndices': 'apm-*',
    'apm_oss.onboardingIndices': 'apm-*',
    'apm_oss.spanIndices': 'apm-*',
    'apm_oss.transactionIndices': 'apm-*',
    'apm_oss.metricsIndices': 'apm-*',
    apmAgentConfigurationIndex: 'apm-*',
  }),
}));

jest.mock('../index_pattern/get_dynamic_index_pattern', () => ({
  getDynamicIndexPattern: async () => {
    return;
  },
}));

function getMockRequest() {
  const mockContext = ({
    config: new Proxy(
      {},
      {
        get: () => 'apm-*',
      }
    ) as APMConfig,
    params: {
      query: {
        _debug: false,
      },
    },
    core: {
      elasticsearch: {
        legacy: {
          client: {
            callAsCurrentUser: jest.fn(),
            callAsInternalUser: jest.fn(),
          },
        },
      },
      uiSettings: {
        client: {
          get: jest.fn().mockResolvedValue(false),
        },
      },
      savedObjects: {
        client: {
          get: jest.fn(),
        },
      },
    },
    plugins: {
      ml: undefined,
    },
  } as unknown) as APMRequestHandlerContext & {
    core: {
      elasticsearch: {
        legacy: {
          client: {
            callAsCurrentUser: jest.Mock<any, any>;
            callAsInternalUser: jest.Mock<any, any>;
          };
        };
      };
      uiSettings: {
        client: {
          get: jest.Mock<any, any>;
        };
      };
      savedObjects: {
        client: {
          get: jest.Mock<any, any>;
        };
      };
    };
  };

  const mockRequest = ({
    url: '',
  } as unknown) as KibanaRequest;

  return { mockContext, mockRequest };
}

describe('setupRequest', () => {
  it('should call callWithRequest with default args', async () => {
    const { mockContext, mockRequest } = getMockRequest();
    const { apmEventClient } = await setupRequest(mockContext, mockRequest);
    await apmEventClient.search({
      apm: { events: [ProcessorEvent.transaction] },
      body: { foo: 'bar' },
    });
    expect(
      mockContext.core.elasticsearch.legacy.client.callAsCurrentUser
    ).toHaveBeenCalledWith('search', {
      index: ['apm-*'],
      body: {
        foo: 'bar',
        query: {
          bool: {
            filter: [
              { terms: { 'processor.event': ['transaction'] } },
              { range: { 'observer.version_major': { gte: 7 } } },
            ],
          },
        },
      },
      ignore_throttled: true,
    });
  });

  it('should call callWithInternalUser with default args', async () => {
    const { mockContext, mockRequest } = getMockRequest();
    const { internalClient } = await setupRequest(mockContext, mockRequest);
    await internalClient.search({
      index: ['apm-*'],
      body: { foo: 'bar' },
    } as any);
    expect(
      mockContext.core.elasticsearch.legacy.client.callAsInternalUser
    ).toHaveBeenCalledWith('search', {
      index: ['apm-*'],
      body: {
        foo: 'bar',
      },
    });
  });

  describe('observer.version_major filter', () => {
    it('should merge `observer.version_major` filter with existing boolean filters', async () => {
      const { mockContext, mockRequest } = getMockRequest();
      const { apmEventClient } = await setupRequest(mockContext, mockRequest);
      await apmEventClient.search({
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: { query: { bool: { filter: [{ term: 'someTerm' }] } } },
      });
      const params =
        mockContext.core.elasticsearch.legacy.client.callAsCurrentUser.mock
          .calls[0][1];
      expect(params.body).toEqual({
        query: {
          bool: {
            filter: [
              { term: 'someTerm' },
              { terms: { [PROCESSOR_EVENT]: ['transaction'] } },
              { range: { 'observer.version_major': { gte: 7 } } },
            ],
          },
        },
      });
    });

    it('should add `observer.version_major` filter if none exists', async () => {
      const { mockContext, mockRequest } = getMockRequest();
      const { apmEventClient } = await setupRequest(mockContext, mockRequest);
      await apmEventClient.search({
        apm: {
          events: [ProcessorEvent.error],
        },
      });
      const params =
        mockContext.core.elasticsearch.legacy.client.callAsCurrentUser.mock
          .calls[0][1];
      expect(params.body).toEqual({
        query: {
          bool: {
            filter: [
              { terms: { [PROCESSOR_EVENT]: ['error'] } },
              { range: { 'observer.version_major': { gte: 7 } } },
            ],
          },
        },
      });
    });

    it('should not add `observer.version_major` filter if `includeLegacyData=true`', async () => {
      const { mockContext, mockRequest } = getMockRequest();
      const { apmEventClient } = await setupRequest(mockContext, mockRequest);
      await apmEventClient.search(
        {
          apm: {
            events: [ProcessorEvent.error],
          },
          body: { query: { bool: { filter: [{ term: 'someTerm' }] } } },
        },
        {
          includeLegacyData: true,
        }
      );
      const params =
        mockContext.core.elasticsearch.legacy.client.callAsCurrentUser.mock
          .calls[0][1];
      expect(params.body).toEqual({
        query: {
          bool: {
            filter: [
              { term: 'someTerm' },
              {
                terms: {
                  [PROCESSOR_EVENT]: ['error'],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('ignore_throttled', () => {
    it('should set `ignore_throttled=true` if `includeFrozen=false`', async () => {
      const { mockContext, mockRequest } = getMockRequest();

      // mock includeFrozen to return false
      mockContext.core.uiSettings.client.get.mockResolvedValue(false);

      const { apmEventClient } = await setupRequest(mockContext, mockRequest);

      await apmEventClient.search({
        apm: {
          events: [],
        },
      });

      const params =
        mockContext.core.elasticsearch.legacy.client.callAsCurrentUser.mock
          .calls[0][1];
      expect(params.ignore_throttled).toBe(true);
    });

    it('should set `ignore_throttled=false` if `includeFrozen=true`', async () => {
      const { mockContext, mockRequest } = getMockRequest();

      // mock includeFrozen to return true
      mockContext.core.uiSettings.client.get.mockResolvedValue(true);

      const { apmEventClient } = await setupRequest(mockContext, mockRequest);

      await apmEventClient.search({
        apm: { events: [] },
      });

      const params =
        mockContext.core.elasticsearch.legacy.client.callAsCurrentUser.mock
          .calls[0][1];
      expect(params.ignore_throttled).toBe(false);
    });
  });
});
