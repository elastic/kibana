/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import { Setup } from '../helpers/setup_request';
import { getIndicesPrivileges } from './get_indices_privileges';

describe('getIndicesPrivileges', () => {
  const indices = {
    apm_oss: {
      errorIndices: 'apm-*',
      metricsIndices: 'apm-*',
      transactionIndices: 'apm-*',
      spanIndices: 'apm-*'
    }
  };
  it('logs the error when fetching privileges', async () => {
    const setup = ({
      indices,
      client: {
        hasPrivileges: () => {
          throw new Error(
            'no handler found for uri [/_security/user/_has_privileges]'
          );
        }
      }
    } as unknown) as Setup;
    const logger = ({
      warn: jest.fn()
    } as unknown) as Logger;
    const privileges = await getIndicesPrivileges(setup, logger);
    expect(privileges).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to fetch indices privileges. Error: no handler found for uri [/_security/user/_has_privileges]'
    );
  });
  it('returns indices privileges', async () => {
    const setup = ({
      indices,
      client: {
        hasPrivileges: () => {
          return Promise.resolve({ index: { apm: { read: true } } });
        }
      }
    } as unknown) as Setup;
    const logger = ({
      warn: jest.fn()
    } as unknown) as Logger;
    const privileges = await getIndicesPrivileges(setup, logger);

    expect(privileges).toEqual({ apm: { read: true } });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
