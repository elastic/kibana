/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getIndicesPrivileges } from './get_indices_privileges';
import * as getApmIndicesModule from '../../lib/settings/apm_indices/get_apm_indices';

jest.spyOn(getApmIndicesModule, 'getApmIndices').mockResolvedValue({
  'apm_oss.errorIndices': 'apm-*',
  'apm_oss.metricsIndices': 'apm-*',
  'apm_oss.transactionIndices': 'apm-*',
  'apm_oss.spanIndices': 'apm-*',
} as any);

describe('getIndicesPrivileges', () => {
  const getArgumentsMock = ({
    isSecurityPluginEnabled,
  }: {
    isSecurityPluginEnabled: boolean;
  }) => {
    return {
      context: {
        core: {
          elasticsearch: {
            legacy: {
              client: {
                callAsCurrentUser: jest.fn(),
              },
            },
          },
          savedObjects: {
            client: {},
          },
        },
        plugins: {
          security: isSecurityPluginEnabled ? {} : undefined,
        },
        params: {
          query: {
            _debug: false,
          },
        },
      },
      request: {},
    };
  };

  describe('with default index names', () => {
    beforeEach(() => {
      jest.spyOn(getApmIndicesModule, 'getApmIndices').mockResolvedValue({
        'apm_oss.errorIndices': 'apm-*',
        'apm_oss.metricsIndices': 'apm-*',
        'apm_oss.transactionIndices': 'apm-*',
        'apm_oss.spanIndices': 'apm-*',
      } as any);
    });

    it('return that the user has privileges when security plugin is disabled', async () => {
      const args = getArgumentsMock({ isSecurityPluginEnabled: false });

      const privileges = await getIndicesPrivileges(args as any);

      expect(privileges).toEqual({
        has_all_requested: true,
        index: {},
      });
    });
    it('throws when an error happens while fetching indices privileges', async () => {
      const args = getArgumentsMock({ isSecurityPluginEnabled: true });
      args.context.core.elasticsearch.legacy.client.callAsCurrentUser.mockRejectedValueOnce(
        new Error('unknown error')
      );

      await expect(getIndicesPrivileges(args as any)).rejects.toThrowError(
        'unknown error'
      );
    });

    it("has privileges to read from 'apm-*'", async () => {
      const args = getArgumentsMock({ isSecurityPluginEnabled: true });
      args.context.core.elasticsearch.legacy.client.callAsCurrentUser.mockResolvedValueOnce(
        {
          has_all_requested: true,
          index: {
            'apm-*': { read: true },
          },
        }
      );

      const privileges = await getIndicesPrivileges(args as any);

      expect(privileges).toEqual({
        has_all_requested: true,
        index: {
          'apm-*': {
            read: true,
          },
        },
      });
    });

    it("doesn't have privileges to read from 'apm-*'", async () => {
      const args = getArgumentsMock({ isSecurityPluginEnabled: true });
      args.context.core.elasticsearch.legacy.client.callAsCurrentUser.mockResolvedValueOnce(
        {
          has_all_requested: false,
          index: {
            'apm-*': { read: false },
          },
        }
      );

      const privileges = await getIndicesPrivileges(args as any);

      expect(privileges).toEqual({
        has_all_requested: false,
        index: {
          'apm-*': {
            read: false,
          },
        },
      });
    });
  });

  describe('with specific index names', () => {
    beforeEach(() => {
      jest.spyOn(getApmIndicesModule, 'getApmIndices').mockResolvedValue({
        'apm_oss.errorIndices': 'apm-*-error',
        'apm_oss.metricsIndices': 'apm-*-metric',
        'apm_oss.transactionIndices': 'apm-*-transaction',
        'apm_oss.spanIndices': 'apm-*-span',
      } as any);
    });
    it("doesn't have privileges on multiple indices", async () => {
      const args = getArgumentsMock({ isSecurityPluginEnabled: true });
      args.context.core.elasticsearch.legacy.client.callAsCurrentUser.mockResolvedValueOnce(
        {
          has_all_requested: false,
          index: {
            'apm-*-error': { read: false },
            'apm-*-transaction': { read: false },
            'apm-*-metric': { read: true },
            'apm-*-span': { read: true },
          },
        }
      );

      const privileges = await getIndicesPrivileges(args as any);

      expect(privileges).toEqual({
        has_all_requested: false,
        index: {
          'apm-*-error': { read: false },
          'apm-*-transaction': { read: false },
          'apm-*-metric': { read: true },
          'apm-*-span': { read: true },
        },
      });
    });
  });
});
