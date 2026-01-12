/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { INTERNAL_API_BASE_PATH } from './constants';
import { indicesHelpers } from './lib/indices.helpers';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  const { createIndex, deleteAllIndices } = indicesHelpers(getService);

  describe('index doc count', () => {
    after(async () => await deleteAllIndices());

    it('returns counts per index and fills missing buckets with 0', async () => {
      const indexA = await createIndex('doc-count-a');
      const indexB = await createIndex('doc-count-b');

      await es.index({ index: indexA, document: { foo: 'a1' } });
      await es.index({ index: indexA, document: { foo: 'a2' } });
      await es.index({ index: indexA, document: { foo: 'a3' } });
      await es.indices.refresh({ index: [indexA, indexB] });

      const { body } = await supertest
        .post(`${INTERNAL_API_BASE_PATH}/index_doc_count`)
        .set('kbn-xsrf', 'xxx')
        .send({ indexNames: [indexA, indexB] })
        .expect(200);

      expect(body).to.eql({
        [indexA]: 3,
        [indexB]: 0,
      });
    });

    it('returns counts for > 10 indices (terms agg size must cover all requested indices)', async () => {
      const indices: string[] = await Promise.all(
        Array.from({ length: 12 }, (_, i) => createIndex(`doc-count-many-${i}`))
      );

      // Put docs in a couple indices, including one beyond the 10th bucket.
      await es.index({ index: indices[0], document: { foo: 'a1' } });
      await es.index({ index: indices[11], document: { foo: 'z1' } });

      await es.indices.refresh({ index: indices });

      const { body } = await supertest
        .post(`${INTERNAL_API_BASE_PATH}/index_doc_count`)
        .set('kbn-xsrf', 'xxx')
        .send({ indexNames: indices })
        .expect(200);

      expect(Object.keys(body).length).to.be(indices.length);
      expect(body[indices[0]]).to.be(1);
      expect(body[indices[11]]).to.be(1);
      expect(body[indices[5]]).to.be(0);
    });

    it('validates request body (indexNames must be non-empty)', async () => {
      await supertest
        .post(`${INTERNAL_API_BASE_PATH}/index_doc_count`)
        .set('kbn-xsrf', 'xxx')
        .send({ indexNames: [] })
        .expect(400);
    });
  });
}
