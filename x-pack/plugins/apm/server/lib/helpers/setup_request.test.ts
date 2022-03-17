/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';
import { setupRequest } from './setup_request';
import { APMConfig } from '../..';
import { APMRouteHandlerResources } from '../../routes/typings';
import { ProcessorEvent } from '../../../common/processor_event';
import { getApmIndices } from '../../routes/settings/apm_indices/get_apm_indices';

jest.mock('../../routes/settings/apm_indices/get_apm_indices', () => ({
  getApmIndices: async () =>
    ({
      sourcemap: 'apm-*',
      error: 'apm-*',
      onboarding: 'apm-*',
      span: 'apm-*',
      transaction: 'apm-*',
      metric: 'apm-*',
      apmAgentConfigurationIndex: 'apm-*',
    } as Awaited<ReturnType<typeof getApmIndices>>),
}));

jest.mock('../../routes/data_view/get_dynamic_data_view', () => ({
  getDynamicDataView: async () => {
    return;
  },
}));

function getMockResources() {
  const esClientMock = elasticsearchServiceMock.createScopedClusterClient();
  // @ts-expect-error incomplete definition
  esClientMock.asCurrentUser.search.mockResponse({});
  // @ts-expect-error incomplete definition
  esClientMock.asInternalUser.search.mockResponse({});

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
        body: { size: 10 },
      });

      expect(
        mockResources.context.core.elasticsearch.client.asCurrentUser.search
      ).toHaveBeenCalledWith(
        {
          index: ['apm-*'],
          body: {
            foo: 'bar',
            query: {
              bool: {
                filter: [{ terms: { 'processor.event': ['transaction'] } }],
              },
            },
          },
          ignore_unavailable: true,
          preference: 'any',
        },
        {
          signal: expect.any(Object),
          meta: true,
        }
      );
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
      ).toHaveBeenCalledWith(
        {
          index: ['apm-*'],
          body: {
            foo: 'bar',
          },
        },
        {
          signal: expect.any(Object),
          meta: true,
        }
      );
    });
  });
});

describe('with includeFrozen=false', () => {
  it('should NOT send "ignore_throttled:true" in the request', async () => {
    const mockResources = getMockResources();

    // mock includeFrozen to return false
    mockResources.context.core.uiSettings.client.get.mockResolvedValue(false);

    const { apmEventClient } = await setupRequest(mockResources);

    await apmEventClient.search('foo', {
      apm: {
        events: [],
      },
      body: { size: 10 },
    });

    const params =
      mockResources.context.core.elasticsearch.client.asCurrentUser.search.mock
        .calls[0][0];
    // @ts-expect-error missing body definition
    expect(params.ignore_throttled).toBe(undefined);
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
      body: { size: 10 },
    });

    const params =
      mockResources.context.core.elasticsearch.client.asCurrentUser.search.mock
        .calls[0][0];
    // @ts-expect-error missing body definition
    expect(params.ignore_throttled).toBe(false);
  });
});
