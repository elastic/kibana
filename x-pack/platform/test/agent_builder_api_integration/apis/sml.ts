/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { smlElasticsearchIndexMappings, smlIndexName } from '@kbn/agent-builder-plugin/server';
import type {
  SmlSearchHttpResponse,
  SmlAutocompleteHttpResponse,
} from '@kbn/agent-context-layer-plugin/common/http_api/sml';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('SML internal API', function () {
    this.tags(['skipServerless']);

    describe('POST /internal/agent_context_layer/sml/_search', () => {
      const runId = uuidv4();
      const chunkId = `sml-ftr-search-${runId}`;
      const originId = `sml-ftr-origin-${runId}`;
      const indexedTitle = `sml ftr search pacific bluefin ${runId}`;

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
            origin: { uri: `visualization://${originId}` },
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

      it('returns a hit when a full-term query matches the title (BM25)', async () => {
        const response = await supertest
          .post('/internal/agent_context_layer/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: 'pacific', size: 20 })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;
        expect(body.results.length).to.be.greaterThan(0);
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).to.be.ok();
        expect(match!.title).to.contain('pacific');
        expect(match!.origin).to.eql({ uri: `visualization://${originId}` });
        expect(match!.type).to.be('visualization');
      });

      it('returns a compact item shape (no content blob by default) for wildcard', async () => {
        const response = await supertest
          .post('/internal/agent_context_layer/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '*', size: 10 })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;

        expect(body).to.have.property('results');
        expect(body.results).to.be.an('array');

        for (const item of body.results) {
          expect(item).to.have.property('id');
          expect(item.id).to.be.a('string');
          expect(item).to.have.property('origin');
          expect(item.origin).to.have.property('uri');
          expect(item).to.have.property('type');
          expect(item).to.have.property('title');
          expect(item).not.to.have.property('score');
          // Baseline: content is not returned unless explicitly requested via fields[].
          expect(item).not.to.have.property('content');
        }
      });

      it('rejects an empty query string', async () => {
        await supertest
          .post('/internal/agent_context_layer/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '' })
          .expect(400);
      });
    });

    describe('POST /internal/agent_context_layer/sml/_autocomplete', () => {
      const runId = uuidv4();
      const chunkId = `sml-ftr-autocomp-${runId}`;
      const originId = `sml-ftr-ac-origin-${runId}`;
      const recordType = `ftrtype${runId.replace(/-/g, '').slice(0, 8)}`;
      // Distinct tokens chosen so the prefix queries below match only this record.
      const titleValue = `unicornsprocket ${runId}`;
      const taglineValue = `ferromagnetic-${runId}`;

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
            type: recordType,
            title: titleValue,
            origin_id: originId,
            origin: { uri: `${recordType}://${originId}` },
            content: `autocomplete content for ${runId}`,
            // Indexer auto-prepends title + type into discovery_labels at write
            // time. Here we index via raw `es.index` so we mirror that shape
            // explicitly to exercise the route end-to-end.
            discovery_labels: [
              { value: titleValue, kind: 'title' },
              { value: recordType, kind: 'type' },
              { value: taglineValue, kind: 'tagline' },
            ],
            created_at: now,
            updated_at: now,
            spaces: ['default'],
            permissions: [],
          },
        });
      });

      after(async () => {
        try {
          await es.delete({ index: smlIndexName, id: chunkId, refresh: true });
        } catch {
          // ignore cleanup failures
        }
      });

      it('matches a short prefix against the auto-prepended title label', async () => {
        const response = await supertest
          .post('/internal/agent_context_layer/sml/_autocomplete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: 'unicorn', size: 10 })
          .expect(200);

        const body = response.body as SmlAutocompleteHttpResponse;
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).to.be.ok();
        expect(match!.type).to.be(recordType);
        expect(match!.title).to.be(titleValue);
        expect(match!.origin).to.eql({ uri: `${recordType}://${originId}` });

        const titleLabel = match!.matched_discovery_labels?.find((l) => l.kind === 'title');
        expect(titleLabel).to.be.ok();
        expect(titleLabel!.value).to.be(titleValue);
        // `highlighted` is omitted here because SAYT + bool_prefix + nested
        // inner_hits doesn't return useful highlight snippets in current ES
        // (bug elastic/elasticsearch#53744). The route is forward-compatible:
        // UI handles `highlighted` when present, plain `value` otherwise.
        expect(titleLabel!.highlighted).to.be(undefined);
      });

      it('matches a producer-supplied tagline label and surfaces its kind', async () => {
        const response = await supertest
          .post('/internal/agent_context_layer/sml/_autocomplete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: 'ferro', size: 10 })
          .expect(200);

        const body = response.body as SmlAutocompleteHttpResponse;
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).to.be.ok();
        const taglineLabel = match!.matched_discovery_labels?.find((l) => l.kind === 'tagline');
        expect(taglineLabel).to.be.ok();
        expect(taglineLabel!.value).to.be(taglineValue);
        expect(taglineLabel!.highlighted).to.be(undefined);
      });

      it('matches a prefix of the auto-prepended type label', async () => {
        const typePrefix = recordType.slice(0, 5);
        const response = await supertest
          .post('/internal/agent_context_layer/sml/_autocomplete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: typePrefix, size: 10 })
          .expect(200);

        const body = response.body as SmlAutocompleteHttpResponse;
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).to.be.ok();
        const typeLabel = match!.matched_discovery_labels?.find((l) => l.kind === 'type');
        expect(typeLabel).to.be.ok();
        expect(typeLabel!.value).to.be(recordType);
      });

      it('returns the result with the expected shape (no content, no permissions)', async () => {
        const response = await supertest
          .post('/internal/agent_context_layer/sml/_autocomplete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: 'unicorn', size: 10 })
          .expect(200);

        const body = response.body as SmlAutocompleteHttpResponse;
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).to.be.ok();
        // Autocomplete responses are deliberately narrow — these belong to
        // /sml/_search, not /sml/_autocomplete.
        expect(match).not.to.have.property('content');
        expect(match).not.to.have.property('description');
        expect(match).not.to.have.property('permissions');
        expect(match).not.to.have.property('spaces');
        expect(match).not.to.have.property('score');
      });

      it('rejects an empty query string', async () => {
        await supertest
          .post('/internal/agent_context_layer/sml/_autocomplete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '' })
          .expect(400);
      });
    });
  });
}
