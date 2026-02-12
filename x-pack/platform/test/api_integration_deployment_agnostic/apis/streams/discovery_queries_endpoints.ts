/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { v4 } from 'uuid';
import { getRuleIdFromQueryLink } from '@kbn/streams-plugin/server/lib/streams/assets/query/helpers/query';
import { getQueryLinkUuid } from '@kbn/streams-plugin/server/lib/streams/assets/query/query_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { deleteStream, disableStreams, enableStreams, putStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es');

  const STREAM_NAME = 'logs.discovery-queries-endpoints-test';
  const stream: Streams.WiredStream.UpsertRequest['stream'] = {
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      wired: { routing: [], fields: {} },
      failure_store: { inherit: {} },
    },
  };

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Discovery queries endpoints', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });
    });

    after(async () => {
      await disableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
      });
    });

    beforeEach(async () => {
      await putStream(apiClient, STREAM_NAME, { stream, ...emptyAssets });
    });

    afterEach(async () => {
      await deleteStream(apiClient, STREAM_NAME);
    });

    it('sorts non-backed queries first and keeps remaining order stable', async () => {
      const ALERTS_INDEX = '.alerts-streams.alerts-default';

      // The route always queries the alerts index; ensure it's present (even if empty) so the request
      // does not fail with index-not-found when there is no alert data yet.
      try {
        await esClient.indices.createDataStream({ name: ALERTS_INDEX });
      } catch (e) {
        try {
          await esClient.indices.create({ index: ALERTS_INDEX });
        } catch (_) {
          // Ignore if it already exists or cannot be created (e.g. preconfigured by the test env).
        }
      }

      const backedQueryHighCount = {
        id: 'backed-high-count',
        title: 'Backed query (high count)',
        kql: { query: 'message:"backed-high-count"' },
      };
      const backedQueryLowCount = {
        id: 'backed-low-count',
        title: 'Backed query (low count)',
        kql: { query: 'message:"backed-low-count"' },
      };
      await putStream(apiClient, STREAM_NAME, {
        stream,
        ...emptyAssets,
        queries: [backedQueryHighCount, backedQueryLowCount],
      });

      const now = Date.now();
      const from = new Date(now - 60 * 60 * 1000).toISOString();
      const to = new Date(now).toISOString();

      const backedHighRuleId = getRuleIdFromQueryLink({
        'asset.uuid': getQueryLinkUuid(STREAM_NAME, {
          'asset.type': 'query',
          'asset.id': backedQueryHighCount.id,
        }),
        'asset.type': 'query',
        'asset.id': backedQueryHighCount.id,
        query: backedQueryHighCount,
        stream_name: STREAM_NAME,
        rule_backed: true,
      });

      const backedLowRuleId = getRuleIdFromQueryLink({
        'asset.uuid': getQueryLinkUuid(STREAM_NAME, {
          'asset.type': 'query',
          'asset.id': backedQueryLowCount.id,
        }),
        'asset.type': 'query',
        'asset.id': backedQueryLowCount.id,
        query: backedQueryLowCount,
        stream_name: STREAM_NAME,
        rule_backed: true,
      });

      // Create alert docs so the terms aggregation yields a deterministic order for backed queries:
      // doc_count(backed-high-count) > doc_count(backed-low-count).
      await esClient.index({
        index: ALERTS_INDEX,
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date(now - 30 * 60 * 1000).toISOString(),
          'kibana.alert.rule.uuid': backedHighRuleId,
        },
      });
      await esClient.index({
        index: ALERTS_INDEX,
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date(now - 20 * 60 * 1000).toISOString(),
          'kibana.alert.rule.uuid': backedHighRuleId,
        },
      });
      await esClient.index({
        index: ALERTS_INDEX,
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date(now - 10 * 60 * 1000).toISOString(),
          'kibana.alert.rule.uuid': backedLowRuleId,
        },
      });

      const unbackedQueryIds = ['unbacked-1', 'unbacked-2'] as const;
      const unbackedDocIds = [v4(), v4()] as const;
      await Promise.all(
        unbackedQueryIds.map((unbackedQueryId, idx) =>
          esClient.index({
            index: '.kibana_streams_assets',
            id: unbackedDocIds[idx],
            refresh: 'wait_for',
            document: {
              'asset.uuid': `unbacked-${unbackedDocIds[idx]}`,
              'asset.type': 'query',
              'asset.id': unbackedQueryId,
              'stream.name': STREAM_NAME,
              'query.title': `Unbacked query ${idx + 1}`,
              'query.kql.query': `message:"${unbackedQueryId}"`,
              rule_backed: false,
            },
          })
        )
      );

      const response = await apiClient
        .fetch('GET /internal/streams/_significant_events', {
          params: {
            query: {
              from,
              to,
              bucketSize: '1h',
              streamNames: [STREAM_NAME],
            },
          },
        })
        .expect(200)
        .then((res) => res.body);

      expect(response).to.have.property('significant_events');
      expect(response.significant_events.length).to.be.greaterThan(0);

      const events = response.significant_events as Array<{ id: string; rule_backed: boolean }>;
      const firstBackedIndex = events.findIndex((event) => event.rule_backed === true);
      expect(firstBackedIndex).to.be.greaterThan(-1);

      // All non-backed queries should appear before backed queries.
      expect(events.slice(0, firstBackedIndex).every((event) => event.rule_backed === false)).to.be(
        true
      );
      expect(events.slice(firstBackedIndex).every((event) => event.rule_backed === true)).to.be(
        true
      );

      // Unbacked queries are present at the top (order between them is not important).
      const unbackedIds = events.slice(0, firstBackedIndex).map((event) => event.id);
      expect(unbackedIds.sort()).to.eql([...unbackedQueryIds].sort());

      // Backed queries keep their pre-sort order (as returned by ES), with the only change being that
      // unbacked queries are moved to the top.
      const backedIds = events.slice(firstBackedIndex).map((event) => event.id);
      expect(backedIds).to.eql([backedQueryHighCount.id, backedQueryLowCount.id]);

      await Promise.all(
        unbackedDocIds.map((id) =>
          esClient.delete({
            index: '.kibana_streams_assets',
            id,
            refresh: 'wait_for',
          })
        )
      );
    });
  });
}
