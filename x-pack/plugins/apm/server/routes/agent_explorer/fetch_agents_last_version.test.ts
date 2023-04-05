/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetchMock from 'fetch-mock';

import { loggerMock } from '@kbn/logging-mocks';
import { fetchAgentsLatestVersion } from './fetch_agents_latest_version';

describe('ApmFetchAgentslatestsVersion', () => {
  const logger = loggerMock.create();

  afterEach(() => {
    fetchMock.restore();
  });

  it('when url is empty should not fetch latest versions', async () => {
    const { data, error } = await fetchAgentsLatestVersion(logger, '');

    expect(fetchMock.called()).toBeFalsy();
    expect(data).toEqual({});
    expect(error).toBeFalsy();
  });

  describe('when url is defined', () => {
    it('should handle errors gracefully', async () => {
      fetchMock.mock('*', { status: 408 });

      const { data, error } = await fetchAgentsLatestVersion(logger, 'my-url');

      expect(fetchMock.called()).toBeTruthy();
      expect(data).toEqual({});
      expect(error?.statusCode).toEqual('408');
    });

    it('should return latest agents version', async () => {
      fetchMock.mock('*', { java: '1.1.0' });

      const { data, error } = await fetchAgentsLatestVersion(logger, 'my-url');

      expect(fetchMock.called()).toBeTruthy();
      expect(data).toEqual({ java: '1.1.0' });
      expect(error).toBeFalsy();
    });
  });
});
