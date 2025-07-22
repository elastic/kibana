/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { disableStreams, enableStreams, forkStream } from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

async function simulateDateSuggestions(
  client: StreamsSupertestRepositoryClient,
  name: string,
  body: ClientRequestParamsOf<
    StreamsRouteRepository,
    'POST /internal/streams/{name}/processing/_suggestions/date'
  >['params']['body'],
  statusCode = 200
) {
  return client
    .fetch('POST /internal/streams/{name}/processing/_suggestions/date', {
      params: {
        path: { name },
        body,
      },
    })
    .expect(statusCode);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Processing Date Suggestions', () => {
    const TEST_STREAM_NAME = 'logs.test';

    const TIMESTAMP_ISO8601 = '2025-01-01T00:00:00.000Z';
    const TIMESTAMP_ISO8601_SPACED = '2025-01-01 00:00:00.000Z';
    const TIMESTAMP_HTTPLIKE = 'Wed Jan 01 00:00:00 2025';
    const TIMESTAMP_INVALID = 'invalid-date';

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);

      await enableStreams(apiClient);

      // Create a forked stream for testing
      await forkStream(apiClient, 'logs', {
        stream: {
          name: TEST_STREAM_NAME,
        },
        if: {
          field: 'host.name',
          operator: 'eq' as const,
          value: 'test-host',
        },
      });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('should return valid date formats for valid date samples', async () => {
      const response = await simulateDateSuggestions(apiClient, TEST_STREAM_NAME, {
        dates: [TIMESTAMP_ISO8601, TIMESTAMP_ISO8601_SPACED, TIMESTAMP_HTTPLIKE],
      });

      expect(response.body.formats).to.eql([
        'ISO8601',
        'yyyy-MM-dd HH:mm:ss.SSSXX',
        'EEE MMM dd HH:mm:ss yyyy',
      ]);
    });

    it('should return unique date formats for duplicate date samples', async () => {
      const response = await simulateDateSuggestions(apiClient, TEST_STREAM_NAME, {
        dates: [
          TIMESTAMP_ISO8601,
          TIMESTAMP_ISO8601_SPACED,
          TIMESTAMP_HTTPLIKE,
          TIMESTAMP_HTTPLIKE,
          TIMESTAMP_ISO8601_SPACED,
          TIMESTAMP_ISO8601,
        ],
      });

      expect(response.body.formats).to.eql([
        'ISO8601',
        'yyyy-MM-dd HH:mm:ss.SSSXX',
        'EEE MMM dd HH:mm:ss yyyy',
      ]);
    });

    it('should gracefully return no formats when there are only invalid dates', async () => {
      const response = await simulateDateSuggestions(apiClient, TEST_STREAM_NAME, {
        dates: [TIMESTAMP_INVALID],
      });

      expect(response.body.formats).to.be.empty();
    });

    it('should handle a mix of valid and invalid date samples gracefully, returning only detected formats', async () => {
      const response = await simulateDateSuggestions(apiClient, TEST_STREAM_NAME, {
        dates: [TIMESTAMP_ISO8601, TIMESTAMP_INVALID],
      });

      expect(response.body.formats).to.eql(['ISO8601']);
    });

    it('should return an empty formats array if no valid formats are detected', async () => {
      const response = await simulateDateSuggestions(apiClient, TEST_STREAM_NAME, {
        dates: ['9999-99-99T99:99:99.999Z'], // Invalid date format
      });

      expect(response.body.formats).to.be.empty();
    });
  });
}
