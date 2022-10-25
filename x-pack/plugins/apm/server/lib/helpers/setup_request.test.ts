/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { setupRequest } from './setup_request';
import { APMConfig } from '../..';
import { APMRouteHandlerResources } from '../../routes/typings';
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
