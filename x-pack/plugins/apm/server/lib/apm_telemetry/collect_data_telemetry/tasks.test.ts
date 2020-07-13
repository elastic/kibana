/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tasks } from './tasks';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';

describe('data telemetry collection tasks', () => {
  const indices = {
    'apm_oss.errorIndices': 'apm-8.0.0-error',
    'apm_oss.metricsIndices': 'apm-8.0.0-metric',
    'apm_oss.spanIndices': 'apm-8.0.0-span',
    'apm_oss.transactionIndices': 'apm-8.0.0-transaction',
  } as ApmIndicesConfig;

  describe('cloud', () => {
    const cloudTask = tasks.find((task) => task.name === 'cloud');

    it('returns a map of cloud provider data', async () => {
      const search = jest.fn().mockResolvedValueOnce({
        aggregations: {
          availability_zone: {
            buckets: [
              { doc_count: 1, key: 'us-west-1' },
              { doc_count: 1, key: 'europe-west1-c' },
            ],
          },
          provider: {
            buckets: [
              { doc_count: 1, key: 'aws' },
              { doc_count: 1, key: 'gcp' },
            ],
          },
          region: {
            buckets: [
              { doc_count: 1, key: 'us-west' },
              { doc_count: 1, key: 'europe-west1' },
            ],
          },
        },
      });

      expect(await cloudTask?.executor({ indices, search } as any)).toEqual({
        cloud: {
          availability_zone: ['us-west-1', 'europe-west1-c'],
          provider: ['aws', 'gcp'],
          region: ['us-west', 'europe-west1'],
        },
      });
    });

    describe('with no results', () => {
      it('returns an empty map', async () => {
        const search = jest.fn().mockResolvedValueOnce({});

        expect(await cloudTask?.executor({ indices, search } as any)).toEqual({
          cloud: {
            availability_zone: [],
            provider: [],
            region: [],
          },
        });
      });
    });
  });

  describe('integrations', () => {
    const integrationsTask = tasks.find((task) => task.name === 'integrations');

    it('returns the count of ML jobs', async () => {
      const transportRequest = jest
        .fn()
        .mockResolvedValueOnce({ body: { count: 1 } });

      expect(
        await integrationsTask?.executor({ indices, transportRequest } as any)
      ).toEqual({
        integrations: {
          ml: {
            all_jobs_count: 1,
          },
        },
      });
    });

    describe('with no data', () => {
      it('returns a count of 0', async () => {
        const transportRequest = jest.fn().mockResolvedValueOnce({});

        expect(
          await integrationsTask?.executor({ indices, transportRequest } as any)
        ).toEqual({
          integrations: {
            ml: {
              all_jobs_count: 0,
            },
          },
        });
      });
    });
  });
});
