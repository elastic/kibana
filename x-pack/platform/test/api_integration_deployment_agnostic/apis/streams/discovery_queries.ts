/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { emptyAssets } from '@kbn/streams-schema';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { getQueryLinkUuid } from '@kbn/streams-plugin/server/lib/streams/assets/query/query_client';
import { getRuleIdFromQueryLink } from '@kbn/streams-plugin/server/lib/streams/assets/query/helpers/query';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { deleteStream, disableStreams, enableStreams, putStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Discovery queries endpoints', function () {
    const STREAM_NAME = 'logs.discovery-queries-test';
    let alertCleanup: { ruleIds: string[]; fromIso: string; toIso: string } | undefined;

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

    const queries: NonNullable<Streams.all.UpsertRequest['queries']> = [
      {
        id: 'q1',
        title: 'Bravo',
        kql: { query: "message:'bravo'" },
        severity_score: 10,
      },
      {
        id: 'q2',
        title: 'Alpha',
        kql: { query: "message:'alpha'" },
        severity_score: 10,
      },
      {
        id: 'q3',
        title: 'Charlie',
        kql: { query: "message:'charlie'" },
        severity_score: 30,
      },
      {
        id: 'q4',
        title: 'Delta',
        kql: { query: "message:'delta'" },
      },
      {
        id: 'q5',
        title: 'Echo',
        kql: { query: "message:'echo'" },
        severity_score: 5,
      },
    ];

    const computeRuleId = (query: StreamQuery) => {
      const assetUuid = getQueryLinkUuid(STREAM_NAME, {
        'asset.type': 'query',
        'asset.id': query.id,
      });
      return getRuleIdFromQueryLink({
        'asset.uuid': assetUuid,
        'asset.type': 'query',
        'asset.id': query.id,
        query,
        stream_name: STREAM_NAME,
        rule_backed: true,
      });
    };

    const deleteAlertsForRuleIds = async (ruleIds: string[], fromIso: string, toIso: string) => {
      if (ruleIds.length === 0) return;
      await esClient.deleteByQuery({
        index: '.alerts-streams.alerts-default',
        refresh: true,
        query: {
          bool: {
            filter: [
              { terms: { 'kibana.alert.rule.uuid': ruleIds } },
              { range: { '@timestamp': { gte: fromIso, lte: toIso } } },
            ],
          },
        },
      });
    };

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
      await putStream(apiClient, STREAM_NAME, {
        stream,
        ...emptyAssets,
        queries,
      });
      alertCleanup = undefined;
    });

    afterEach(async () => {
      if (alertCleanup) {
        await deleteAlertsForRuleIds(
          alertCleanup.ruleIds,
          alertCleanup.fromIso,
          alertCleanup.toIso
        );
      }
      await deleteStream(apiClient, STREAM_NAME);
    });

    it('GET /internal/streams/_queries paginates query rows', async () => {
      const fromIso = '2025-01-01T00:00:00.000Z';
      const toIso = '2025-01-01T03:00:00.000Z';

      // Expected sort order (see server): severity desc, then title asc
      const expectedSortedIds = ['q3', 'q2', 'q1', 'q5', 'q4'];

      const page1 = await apiClient
        .fetch('GET /internal/streams/_queries', {
          params: {
            query: {
              from: fromIso,
              to: toIso,
              bucketSize: '1h',
              streamNames: [STREAM_NAME],
              page: 1,
              perPage: 2,
            },
          },
        })
        .expect(200)
        .then((res) => res.body);

      expect(page1.total).to.eql(5);
      expect(page1.page).to.eql(1);
      expect(page1.perPage).to.eql(2);
      expect(page1.queries.map((q: any) => q.id)).to.eql(expectedSortedIds.slice(0, 2));

      const page2 = await apiClient
        .fetch('GET /internal/streams/_queries', {
          params: {
            query: {
              from: fromIso,
              to: toIso,
              bucketSize: '1h',
              streamNames: [STREAM_NAME],
              page: 2,
              perPage: 2,
            },
          },
        })
        .expect(200)
        .then((res) => res.body);

      expect(page2.total).to.eql(5);
      expect(page2.queries.map((q: any) => q.id)).to.eql(expectedSortedIds.slice(2, 4));

      const page3 = await apiClient
        .fetch('GET /internal/streams/_queries', {
          params: {
            query: {
              from: fromIso,
              to: toIso,
              bucketSize: '1h',
              streamNames: [STREAM_NAME],
              page: 3,
              perPage: 2,
            },
          },
        })
        .expect(200)
        .then((res) => res.body);

      expect(page3.total).to.eql(5);
      expect(page3.queries.map((q: any) => q.id)).to.eql(expectedSortedIds.slice(4, 5));

      const page4 = await apiClient
        .fetch('GET /internal/streams/_queries', {
          params: {
            query: {
              from: fromIso,
              to: toIso,
              bucketSize: '1h',
              streamNames: [STREAM_NAME],
              page: 4,
              perPage: 2,
            },
          },
        })
        .expect(200)
        .then((res) => res.body);

      expect(page4.total).to.eql(5);
      expect(page4.queries).to.eql([]);
    });

    it('GET /internal/streams/_queries/_occurrences returns histogram + total occurrences', async () => {
      const fromIso = '2025-01-02T00:00:00.000Z';
      const toIso = '2025-01-02T03:00:00.000Z';
      const ruleId = computeRuleId(queries[0]);
      alertCleanup = { ruleIds: [ruleId], fromIso, toIso };

      // Seed a few synthetic alerts for one query/rule.
      await esClient.index({
        index: '.alerts-streams.alerts-default',
        refresh: 'wait_for',
        document: {
          '@timestamp': '2025-01-02T00:10:00.000Z',
          kibana: { alert: { rule: { uuid: ruleId } } },
        },
      });
      await esClient.index({
        index: '.alerts-streams.alerts-default',
        refresh: 'wait_for',
        document: {
          '@timestamp': '2025-01-02T01:10:00.000Z',
          kibana: { alert: { rule: { uuid: ruleId } } },
        },
      });
      await esClient.index({
        index: '.alerts-streams.alerts-default',
        refresh: 'wait_for',
        document: {
          '@timestamp': '2025-01-02T01:20:00.000Z',
          kibana: { alert: { rule: { uuid: ruleId } } },
        },
      });

      const response = await apiClient
        .fetch('GET /internal/streams/_queries/_occurrences', {
          params: {
            query: {
              from: fromIso,
              to: toIso,
              bucketSize: '1h',
              streamNames: [STREAM_NAME],
            },
          },
        })
        .expect(200)
        .then((res) => res.body);

      expect(response).to.have.property('aggregated_occurrences');
      expect(response.aggregated_occurrences).to.be.an('array');
      expect(response).to.have.property('total_occurrences');
      expect(response.total_occurrences).to.eql(3);

      const summed = response.aggregated_occurrences.reduce((sum: number, b: any) => sum + b.y, 0);
      expect(summed).to.eql(3);
    });
  });
}
