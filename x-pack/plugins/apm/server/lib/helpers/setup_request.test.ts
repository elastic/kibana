/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupRequest } from './setup_request';
import { APMConfig } from '../..';
import { APMRouteHandlerResources } from '../../routes/typings';
import { ProcessorEvent } from '../../../common/processor_event';
import { PROCESSOR_EVENT } from '../../../common/elasticsearch_fieldnames';

jest.mock('../settings/apm_indices/get_apm_indices', () => ({
  getApmIndices: async () => ({
    /* eslint-disable @typescript-eslint/naming-convention */
    'apm_oss.sourcemapIndices': 'apm-*',
    'apm_oss.errorIndices': 'apm-*',
    'apm_oss.onboardingIndices': 'apm-*',
    'apm_oss.spanIndices': 'apm-*',
    'apm_oss.transactionIndices': 'apm-*',
    'apm_oss.metricsIndices': 'apm-*',
    /* eslint-enable @typescript-eslint/naming-convention */
    apmAgentConfigurationIndex: 'apm-*',
  }),
}));

jest.mock('../index_pattern/get_dynamic_index_pattern', () => ({
  getDynamicIndexPattern: async () => {
    return;
  },
}));

function getMockResources() {
  const esClientMock = {
    asCurrentUser: {
      search: jest.fn().mockResolvedValue({ body: {} }),
    },
    asInternalUser: {
      search: jest.fn().mockResolvedValue({ body: {} }),
    },
  };

  const mockResources = {
    config: new Proxy(
      {},
      {
        get: () => 'apm-*',
      }
    ) as APMConfig,
    params: {
      query: {
        _inspect: false,
      },
    },
    context: {
      core: {
        elasticsearch: {
          client: esClientMock,
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
    },
    plugins: {
      ml: undefined,
    },
    request: {
      url: '',
      events: {
        aborted$: {
          subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        },
      },
    },
  } as unknown as APMRouteHandlerResources & {
    context: {
      core: {
        elasticsearch: {
          client: typeof esClientMock;
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
  };

  return mockResources;
}

describe('setupRequest', () => {
  describe('with default args', () => {
    it('calls callWithRequest', async () => {
      const mockResources = getMockResources();
      const { apmEventClient } = await setupRequest(mockResources);
      await apmEventClient.search('foo', {
        apm: { events: [ProcessorEvent.transaction] },
        body: { foo: 'bar' },
      });

      expect(
        mockResources.context.core.elasticsearch.client.asCurrentUser.search
      ).toHaveBeenCalledWith({
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
        ignore_unavailable: true,
        ignore_throttled: true,
        preference: 'any',
      });
    });

    it('calls callWithInternalUser', async () => {
      const mockResources = getMockResources();
      const { internalClient } = await setupRequest(mockResources);
      await internalClient.search('foo', {
        index: ['apm-*'],
        body: { foo: 'bar' },
      } as any);
      expect(
        mockResources.context.core.elasticsearch.client.asInternalUser.search
      ).toHaveBeenCalledWith({
        index: ['apm-*'],
        body: {
          foo: 'bar',
        },
      });
    });
  });

  describe('with a bool filter', () => {
    it('adds a range filter for `observer.version_major` to the existing filter', async () => {
      const mockResources = getMockResources();
      const { apmEventClient } = await setupRequest(mockResources);
      await apmEventClient.search('foo', {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          query: { bool: { filter: [{ term: { field: 'someTerm' } }] } },
        },
      });
      const params =
        mockResources.context.core.elasticsearch.client.asCurrentUser.search
          .mock.calls[0][0];
      expect(params.body).toEqual({
        query: {
          bool: {
            filter: [
              { term: { field: 'someTerm' } },
              { terms: { [PROCESSOR_EVENT]: ['transaction'] } },
              { range: { 'observer.version_major': { gte: 7 } } },
            ],
          },
        },
      });
    });

    it('does not add a range filter for `observer.version_major` if includeLegacyData=true', async () => {
      const mockResources = getMockResources();
      const { apmEventClient } = await setupRequest(mockResources);
      await apmEventClient.search('foo', {
        apm: {
          events: [ProcessorEvent.error],
          includeLegacyData: true,
        },
        body: {
          query: { bool: { filter: [{ term: { field: 'someTerm' } }] } },
        },
      });
      const params =
        mockResources.context.core.elasticsearch.client.asCurrentUser.search
          .mock.calls[0][0];
      expect(params.body).toEqual({
        query: {
          bool: {
            filter: [
              { term: { field: 'someTerm' } },
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
});

describe('without a bool filter', () => {
  it('adds a range filter for `observer.version_major`', async () => {
    const mockResources = getMockResources();
    const { apmEventClient } = await setupRequest(mockResources);
    await apmEventClient.search('foo', {
      apm: {
        events: [ProcessorEvent.error],
      },
    });
    const params =
      mockResources.context.core.elasticsearch.client.asCurrentUser.search.mock
        .calls[0][0];
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
});

describe('with includeFrozen=false', () => {
  it('sets `ignore_throttled=true`', async () => {
    const mockResources = getMockResources();

    // mock includeFrozen to return false
    mockResources.context.core.uiSettings.client.get.mockResolvedValue(false);

    const { apmEventClient } = await setupRequest(mockResources);

    await apmEventClient.search('foo', {
      apm: {
        events: [],
      },
    });

    const params =
      mockResources.context.core.elasticsearch.client.asCurrentUser.search.mock
        .calls[0][0];
    expect(params.ignore_throttled).toBe(true);
  });
});

describe('with includeFrozen=true', () => {
  it('sets `ignore_throttled=false`', async () => {
    const mockResources = getMockResources();

    // mock includeFrozen to return true
    mockResources.context.core.uiSettings.client.get.mockResolvedValue(true);

    const { apmEventClient } = await setupRequest(mockResources);

    await apmEventClient.search('foo', {
      apm: { events: [] },
    });

    const params =
      mockResources.context.core.elasticsearch.client.asCurrentUser.search.mock
        .calls[0][0];
    expect(params.ignore_throttled).toBe(false);
  });
});
