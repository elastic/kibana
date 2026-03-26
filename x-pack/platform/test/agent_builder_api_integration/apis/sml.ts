/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { smlElasticsearchIndexMappings, smlIndexName } from '@kbn/agent-builder-plugin/server';
import type { SmlSearchHttpResponse } from '@kbn/agent-builder-plugin/common/http_api/sml';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('SML internal API', function () {
    this.tags(['skipServerless']);

    describe('POST /internal/agent_builder/sml/_search', () => {
      const runId = uuidv4();
      const chunkId = `sml-ftr-autocomplete-${runId}`;
      const originId = `sml-ftr-origin-${runId}`;
      /** Distinctive title tokens for prefix search (SAYT + bool_prefix). */
      const indexedTitle = `sml ftr autocomplete pacific bluefin ${runId}`;

      before(async () => {
        const exists = await es.indices.exists({ index: smlIndexName });
        if (!exists) {
          await es.indices.create({
            index: smlIndexName,
            mappings: smlElasticsearchIndexMappings,
          });
        }

        const now = '2024-06-01T12:00:00.000Z';
        await es.index({
          index: smlIndexName,
          id: chunkId,
          refresh: 'wait_for',
          document: {
            id: chunkId,
            type: 'visualization',
            title: indexedTitle,
            origin_id: originId,
            content: 'pacific bluefin tuna content for sml ftr',
            created_at: now,
            updated_at: now,
            spaces: ['default'],
            permissions: [],
          },
        });
      });

      after(async () => {
        try {
          await es.delete({
            index: smlIndexName,
            id: chunkId,
            refresh: true,
          });
        } catch {
          // ignore cleanup failures
        }
      });

      it('returns a hit when query matches a partial word in the title (autocomplete)', async () => {
        const response = await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: 'pacif', size: 20 })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;
        expect(body.total).to.be.greaterThan(0);
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).to.be.ok();
        expect(match!.title).to.contain('pacific');
        expect(match!.origin_id).to.be(originId);
        expect(match!.type).to.be('visualization');
      });

      it('returns total and results with the expected item fields (wildcard)', async () => {
        const response = await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '*', size: 10 })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;

        expect(body).to.have.property('total');
        expect(body.total).to.be.a('number');
        expect(body).to.have.property('results');
        expect(body.results).to.be.an('array');

        for (const item of body.results) {
          expect(item).to.have.property('id');
          expect(item.id).to.be.a('string');
          expect(item).to.have.property('origin_id');
          expect(item).to.have.property('type');
          expect(item).to.have.property('title');
          expect(item).to.have.property('content');
          expect(item).to.have.property('score');
          expect(item.score).to.be.a('number');
        }
      });

      it('omits content on each hit when skip_content is true', async () => {
        const response = await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '*', size: 10, skip_content: true })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;
        expect(body.results.length).to.be.greaterThan(0);
        for (const item of body.results) {
          expect(item).not.to.have.property('content');
        }
      });

      it('rejects an empty query string', async () => {
        await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '' })
          .expect(400);
      });
    });
  });
}
