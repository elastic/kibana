/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('node-fetch');
import { loggerMock } from '@kbn/logging-mocks';
import { fetchAgentsLatestVersion } from './fetch_agents_latest_version';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;

describe('ApmFetchAgentslatestsVersion', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('when url is empty should not fetch latest versions', async () => {
    const { data, error } = await fetchAgentsLatestVersion(logger, '');

    expect(fetchMock).toBeCalledTimes(0);
    expect(data).toEqual({});
    expect(error).toBeFalsy();
  });

  describe('when url is defined', () => {
    it('should handle errors gracefully', async () => {
      fetchMock.mockResolvedValue({
        text: () => 'Request Timeout',
        status: 408,
        ok: false,
      });

      const { data, error } = await fetchAgentsLatestVersion(logger, 'my-url');

      expect(fetchMock).toBeCalledTimes(1);
      expect(data).toEqual({});
      expect(error?.statusCode).toEqual('408');
    });

    it('should return latest agents version', async () => {
      fetchMock.mockResolvedValue({
        json: () => ({
          java: '1.1.0',
        }),
        status: 200,
        ok: true,
      });

      const { data, error } = await fetchAgentsLatestVersion(logger, 'my-url');

      expect(fetchMock).toBeCalledTimes(1);
      expect(data).toEqual({ java: '1.1.0' });
      expect(error).toBeFalsy();
    });
  });
});
