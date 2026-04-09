/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LOGS_ECS_STREAM_NAME, LOGS_OTEL_STREAM_NAME } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { deleteStream, forkStream, indexDocument } from './helpers/requests';

const sortNames = (names: string[]) => [...names].sort();

/** Wired stream created by this suite (forked under logs.otel) */
const LIST_TYPE_FILTER_WIRED_STREAM = 'logs.otel.list-type-filter-wired';

/** Unmanaged classic data stream created by this suite */
const LIST_TYPE_FILTER_CLASSIC_STREAM = 'logs-list-type-filter-default';

/**
 * Hardcoded wired stream names this suite expects after fixtures exist.
 * If the environment exposes additional wired streams (or misses these), the test fails.
 */
const EXPECTED_WIRED_STREAM_NAMES = sortNames([
  LOGS_ECS_STREAM_NAME,
  LOGS_OTEL_STREAM_NAME,
  LIST_TYPE_FILTER_WIRED_STREAM,
]);

/**
 * Hardcoded classic stream names this suite expects after fixtures exist.
 * If any other classic streams exist in the cluster, the test fails.
 */
const EXPECTED_CLASSIC_STREAM_NAMES = sortNames([LIST_TYPE_FILTER_CLASSIC_STREAM]);

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  describe('GET /api/streams type query parameter (wired and classic)', () => {
    let apiClient: StreamsSupertestRepositoryClient;

    async function waitUntilStreamsMatchHardcodedExpectation() {
      const {
        body: { streams },
        status,
      } = await apiClient.fetch('GET /api/streams 2023-10-31');
      expect(status).to.eql(200);
      const wiredNames = sortNames(streams.filter((s) => s.type === 'wired').map((s) => s.name));
      const classicNames = sortNames(
        streams.filter((s) => s.type === 'classic').map((s) => s.name)
      );
      expect(wiredNames).to.eql(EXPECTED_WIRED_STREAM_NAMES);
      expect(classicNames).to.eql(EXPECTED_CLASSIC_STREAM_NAMES);
    }

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);

      await forkStream(apiClient, LOGS_OTEL_STREAM_NAME, {
        stream: { name: LIST_TYPE_FILTER_WIRED_STREAM },
        where: { field: 'attributes.test.type', eq: 'list-type-filter-wired' },
      });

      await indexDocument(esClient, LIST_TYPE_FILTER_CLASSIC_STREAM, {
        '@timestamp': new Date().toISOString(),
        message: 'list-type-filter classic fixture',
      });

      await waitUntilStreamsMatchHardcodedExpectation();
    });

    async function fetchFilteredStreamNames(filterType: 'wired' | 'classic') {
      const {
        body: { streams },
        status,
      } = await apiClient.fetch('GET /api/streams 2023-10-31', {
        params: { query: { type: filterType } },
      });
      expect(status).to.eql(200);
      return sortNames(streams.map((s) => s.name));
    }

    after(async () => {
      await deleteStream(apiClient, LIST_TYPE_FILTER_WIRED_STREAM);
    });

    it('type=wired returns exactly the hardcoded wired stream name list', async () => {
      const actual = await fetchFilteredStreamNames('wired');
      expect(actual).to.eql(EXPECTED_WIRED_STREAM_NAMES);
    });

    it('type=classic returns exactly the hardcoded classic stream name list', async () => {
      const actual = await fetchFilteredStreamNames('classic');
      expect(actual).to.eql(EXPECTED_CLASSIC_STREAM_NAMES);
    });

    it('rejects invalid type query value', async () => {
      const { status } = await apiClient.fetch('GET /api/streams 2023-10-31', {
        params: { query: { type: 'invalid' as unknown as 'classic' | 'wired' | 'query' } },
      });
      expect(status).to.eql(400);
    });
  });
}
