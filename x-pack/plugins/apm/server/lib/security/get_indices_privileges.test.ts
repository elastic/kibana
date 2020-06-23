/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';
import { getIndicesPrivileges } from './get_indices_privileges';

describe('getIndicesPrivileges', () => {
  const indices = {
    apm_oss: {
      errorIndices: 'apm-*',
      metricsIndices: 'apm-*',
      transactionIndices: 'apm-*',
      spanIndices: 'apm-*',
    },
  };
  it('return that the user has privileges when security plugin is disabled', async () => {
    const setup = ({
      indices,
      client: {
        hasPrivileges: () => {
          const error = {
            message:
              'no handler found for uri [/_security/user/_has_privileges]',
            statusCode: 400,
          };
          throw error;
        },
      },
    } as unknown) as Setup;
    const privileges = await getIndicesPrivileges({
      setup,
      isSecurityPluginEnabled: false,
    });
    expect(privileges).toEqual({
      has_all_requested: true,
      index: {},
    });
  });
  it('throws when an error happens while fetching indices privileges', async () => {
    const setup = ({
      indices,
      client: {
        hasPrivileges: () => {
          throw new Error('unknow error');
        },
      },
    } as unknown) as Setup;
    await expect(
      getIndicesPrivileges({ setup, isSecurityPluginEnabled: true })
    ).rejects.toThrowError('unknow error');
  });
  it("has privileges to read from 'apm-*'", async () => {
    const setup = ({
      indices,
      client: {
        hasPrivileges: () => {
          return Promise.resolve({
            has_all_requested: true,
            index: { 'apm-*': { read: true } },
          });
        },
      },
    } as unknown) as Setup;
    const privileges = await getIndicesPrivileges({
      setup,
      isSecurityPluginEnabled: true,
    });

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
    const setup = ({
      indices,
      client: {
        hasPrivileges: () => {
          return Promise.resolve({
            has_all_requested: false,
            index: { 'apm-*': { read: false } },
          });
        },
      },
    } as unknown) as Setup;

    const privileges = await getIndicesPrivileges({
      setup,
      isSecurityPluginEnabled: true,
    });

    expect(privileges).toEqual({
      has_all_requested: false,
      index: {
        'apm-*': {
          read: false,
        },
      },
    });
  });
  it("doesn't have privileges on multiple indices", async () => {
    const setup = ({
      indices: {
        apm_oss: {
          errorIndices: 'apm-error-*',
          metricsIndices: 'apm-metrics-*',
          transactionIndices: 'apm-trasanction-*',
          spanIndices: 'apm-span-*',
        },
      },
      client: {
        hasPrivileges: () => {
          return Promise.resolve({
            has_all_requested: false,
            index: {
              'apm-error-*': { read: false },
              'apm-trasanction-*': { read: false },
              'apm-metrics-*': { read: true },
              'apm-span-*': { read: true },
            },
          });
        },
      },
    } as unknown) as Setup;

    const privileges = await getIndicesPrivileges({
      setup,
      isSecurityPluginEnabled: true,
    });

    expect(privileges).toEqual({
      has_all_requested: false,
      index: {
        'apm-error-*': { read: false },
        'apm-trasanction-*': { read: false },
        'apm-metrics-*': { read: true },
        'apm-span-*': { read: true },
      },
    });
  });
});
