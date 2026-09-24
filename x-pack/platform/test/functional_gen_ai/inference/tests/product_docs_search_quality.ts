/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { FtrProviderContext } from '../ftr_provider_context';

const PRODUCTS = ['kibana', 'elasticsearch', 'observability', 'security'] as const;
type ProductName = (typeof PRODUCTS)[number];

const indexFor = (product: ProductName) => `.kibana_ai_product_doc_${product}`;

// Conservative lower bound — exists to catch catastrophic regressions (empty index,
// runaway token filter, etc.) rather than to track exact corpus sizes.
const MIN_DOC_COUNT = 100;

interface SearchHit {
  content_title: string;
  url: string;
  product_name: ProductName;
  slug: string;
}

// Mirrors the BM25 portion of performSearch (product_doc_base/server/services/search/perform_search.ts).
// Semantic clauses are omitted here so the test is not blocked if the ELSER inference
// endpoint is slow or unavailable during the query phase.
const buildSearchQuery = (query: string) => ({
  bool: {
    should: [
      {
        multi_match: {
          query,
          minimum_should_match: '1<-1 3<49%',
          type: 'cross_fields' as const,
          fields: [
            'content_title',
            'content_body.text',
            'ai_subtitle',
            'ai_summary.text',
            'ai_questions_answered.text',
            'ai_tags',
          ],
        },
      },
      {
        multi_match: {
          query,
          type: 'phrase' as const,
          boost: 3,
          slop: 0,
          fields: ['content_title.stem', 'content_body.stem', 'ai_subtitle.stem'],
        },
      },
    ],
  },
});

export const productDocsSearchQualitySuite = (_: {}, { getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');

  const callInstall = (inferenceId: string) =>
    supertest
      .post('/internal/product_doc_base/install')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'foo')
      .send({ inferenceId })
      .expect(200);

  const callUninstall = (inferenceId: string) =>
    supertest
      .post('/internal/product_doc_base/uninstall')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'foo')
      .send({ inferenceId })
      .expect(200);

  const searchDocs = async (query: string, products: ProductName[], topN: number) => {
    const resp = await es.search<SearchHit>({
      index: products.map(indexFor),
      size: topN,
      _source: ['content_title', 'url', 'product_name', 'slug'],
      query: buildSearchQuery(query),
    });
    return resp.hits.hits.map((h) => h._source as SearchHit);
  };

  describe('product docs search quality', () => {
    before(async () => {
      const resp = await callInstall(defaultInferenceEndpoints.ELSER);
      expect(resp.body.installed).to.be(true);
    });

    after(async () => {
      await callUninstall(defaultInferenceEndpoints.ELSER);
    });

    // ── 1. Document count ─────────────────────────────────────────────────

    describe('document count', () => {
      PRODUCTS.forEach((product) => {
        it(`${product} index has at least ${MIN_DOC_COUNT} documents`, async () => {
          const { count } = await es.count({ index: indexFor(product) });
          expect(count).to.be.above(MIN_DOC_COUNT);
        });
      });
    });

    // ── 2. Query relevance ────────────────────────────────────────────────
    //
    // Each case asserts that at least one of the top-5 results matches an
    // expected URL pattern or title keyword. Add cases here when a regression
    // is discovered or a new topic area needs coverage.

    describe('query relevance', () => {
      const TOP_N = 5;

      it('ES|QL overview query surfaces ES|QL content', async () => {
        const hits = await searchDocs('ES|QL overview', [...PRODUCTS], TOP_N);
        const found = hits.some(
          (h) =>
            /esql/i.test(h.url) || /ES\|QL/i.test(h.content_title) || /esql/i.test(h.content_title)
        );
        expect(found).to.be(
          true,
          `Expected an ES|QL result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });

      it('ES|QL pipe syntax query surfaces ES|QL content', async () => {
        const hits = await searchDocs('pipe syntax ES|QL query language', [...PRODUCTS], TOP_N);
        const found = hits.some((h) => /ES\|QL/i.test(h.content_title) || /esql/i.test(h.url));
        expect(found).to.be(
          true,
          `Expected an ES|QL result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });

      it('anomaly detection query surfaces machine-learning content', async () => {
        const hits = await searchDocs(
          'machine learning anomaly detection job',
          ['kibana', 'elasticsearch'],
          TOP_N
        );
        const found = hits.some(
          (h) =>
            /anomaly/i.test(h.url) ||
            /anomaly/i.test(h.content_title) ||
            /machine.learning/i.test(h.url)
        );
        expect(found).to.be(
          true,
          `Expected an anomaly-detection result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });

      it('dashboard creation query surfaces Kibana dashboard content', async () => {
        const hits = await searchDocs('create a dashboard in Kibana', ['kibana'], TOP_N);
        const found = hits.some(
          (h) => /dashboard/i.test(h.url) || /dashboard/i.test(h.content_title)
        );
        expect(found).to.be(
          true,
          `Expected a dashboard result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });

      it('index mapping query surfaces Elasticsearch mapping content', async () => {
        const hits = await searchDocs('index mapping field types', ['elasticsearch'], TOP_N);
        const found = hits.some((h) => /mapping/i.test(h.url) || /mapping/i.test(h.content_title));
        expect(found).to.be(
          true,
          `Expected a mapping result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });

      it('Fleet agent enrollment query surfaces Fleet content', async () => {
        const hits = await searchDocs(
          'enroll Elastic Agent fleet policy',
          ['kibana', 'observability'],
          TOP_N
        );
        const found = hits.some(
          (h) => /fleet/i.test(h.url) || /fleet/i.test(h.content_title) || /agent/i.test(h.url)
        );
        expect(found).to.be(
          true,
          `Expected a Fleet/Agent result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });

      it('alert rule query surfaces detection or alerting content', async () => {
        const hits = await searchDocs('create detection alert rule', ['kibana', 'security'], TOP_N);
        const found = hits.some(
          (h) =>
            /alert/i.test(h.url) ||
            /rule/i.test(h.url) ||
            /alert/i.test(h.content_title) ||
            /rule/i.test(h.content_title)
        );
        expect(found).to.be(
          true,
          `Expected an alert/rule result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });

      it('data view query surfaces data-view or index-pattern content', async () => {
        const hits = await searchDocs('create data view index pattern', ['kibana'], TOP_N);
        const found = hits.some(
          (h) =>
            /data.view/i.test(h.url) ||
            /index.pattern/i.test(h.url) ||
            /data view/i.test(h.content_title)
        );
        expect(found).to.be(
          true,
          `Expected a data-view result in top ${TOP_N}, got: ${JSON.stringify(
            hits.map((h) => h.content_title)
          )}`
        );
      });
    });
  });
};
