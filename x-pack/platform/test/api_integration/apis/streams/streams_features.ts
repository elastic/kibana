/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { FtrProviderContext } from '../../ftr_provider_context';

const STREAMS_INDEX = '.kibana_streams';
const FEATURES_INDEX = '.kibana_streams_features';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('GET /internal/streams/_features', () => {
    const streamA = `streams-api-test-a-${Date.now()}`;
    const streamB = `streams-api-test-b-${Date.now()}`;

    const now = Date.now();
    const expiredUuid = 'expired-uuid';
    const activeUuid = 'active-uuid';
    const noExpiryUuid = 'no-expiry-uuid';

    before(async () => {
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });

      // Ensure required indices exist with compatible mappings.
      if (!(await es.indices.exists({ index: STREAMS_INDEX }))) {
        await es.indices.create({
          index: STREAMS_INDEX,
          mappings: {
            properties: {
              name: { type: 'keyword' },
              description: { type: 'text' },
              updated_at: { type: 'date' },
              ingest: { type: 'object', enabled: false },
              query: { type: 'object', enabled: false },
              query_streams: { type: 'object', enabled: false },
            },
          },
        });
      }

      if (!(await es.indices.exists({ index: FEATURES_INDEX }))) {
        await es.indices.create({
          index: FEATURES_INDEX,
          mappings: {
            properties: {
              stream: {
                properties: {
                  name: { type: 'keyword' },
                },
              },
              feature: {
                properties: {
                  id: { type: 'keyword' },
                  uuid: { type: 'keyword' },
                  type: { type: 'keyword' },
                  subtype: { type: 'keyword' },
                  title: { type: 'keyword' },
                  description: { type: 'text' },
                  properties: { type: 'object', enabled: false },
                  confidence: { type: 'float' },
                  evidence: { type: 'keyword' },
                  status: { type: 'keyword' },
                  last_seen: { type: 'date' },
                  tags: { type: 'keyword' },
                  meta: { type: 'object', enabled: false },
                  expires_at: { type: 'date' },
                },
              },
            },
          },
        });
      }

      const streamDefinitionBase = {
        description: '',
        updated_at: new Date(now).toISOString(),
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date(now).toISOString() },
          settings: {},
          classic: {},
          failure_store: { inherit: {} },
        },
      };

      await es.index({
        index: STREAMS_INDEX,
        id: streamA,
        document: { name: streamA, ...streamDefinitionBase },
        refresh: 'wait_for',
      });
      await es.index({
        index: STREAMS_INDEX,
        id: streamB,
        document: { name: streamB, ...streamDefinitionBase },
        refresh: 'wait_for',
      });

      const storedFeatureBase = {
        'feature.type': 'type',
        'feature.subtype': 'subtype',
        'feature.title': 'title',
        'feature.description': 'description',
        'feature.properties': {},
        'feature.confidence': 0.5,
        'feature.evidence': [],
        'feature.status': 'active',
        'feature.last_seen': new Date(now).toISOString(),
        'feature.tags': [],
        'feature.meta': {},
      };

      await es.index({
        index: FEATURES_INDEX,
        id: expiredUuid,
        document: {
          ...storedFeatureBase,
          'stream.name': streamA,
          'feature.uuid': expiredUuid,
          'feature.id': 'expired-id',
          'feature.expires_at': new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        },
        refresh: 'wait_for',
      });

      await es.index({
        index: FEATURES_INDEX,
        id: activeUuid,
        document: {
          ...storedFeatureBase,
          'stream.name': streamA,
          'feature.uuid': activeUuid,
          'feature.id': 'active-id',
          'feature.expires_at': new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        },
        refresh: 'wait_for',
      });

      await es.index({
        index: FEATURES_INDEX,
        id: noExpiryUuid,
        document: {
          ...storedFeatureBase,
          'stream.name': streamB,
          'feature.uuid': noExpiryUuid,
          'feature.id': 'no-expiry-id',
        },
        refresh: 'wait_for',
      });
    });

    after(async () => {
      await kibanaServer.uiSettings.unset(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS);

      // Best-effort cleanup of the documents we created.
      await Promise.all([
        es.delete({ index: FEATURES_INDEX, id: expiredUuid }, { ignore: [404] }),
        es.delete({ index: FEATURES_INDEX, id: activeUuid }, { ignore: [404] }),
        es.delete({ index: FEATURES_INDEX, id: noExpiryUuid }, { ignore: [404] }),
        es.delete({ index: STREAMS_INDEX, id: streamA }, { ignore: [404] }),
        es.delete({ index: STREAMS_INDEX, id: streamB }, { ignore: [404] }),
      ]);
    });

    it('filters out expired features', async () => {
      const { body } = await supertest
        .get('/internal/streams/_features')
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const uuids = body.features.map((feature: { uuid: string }) => feature.uuid);

      expect(uuids).to.contain(activeUuid);
      expect(uuids).to.contain(noExpiryUuid);
      expect(uuids).not.to.contain(expiredUuid);
    });
  });
}
