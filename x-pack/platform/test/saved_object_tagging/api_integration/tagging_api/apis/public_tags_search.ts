/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('GET /api/tags (search)', () => {
    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
    });

    it('returns tags with default pagination meta when called without query parameters', async () => {
      const { body } = await supertest.get('/api/tags').expect(200);

      expect(body.meta.page).to.be(1);
      expect(body.meta.per_page).to.be(20);
      expect(body.meta.total).to.be.greaterThan(0);
      expect(body.meta.total).to.be.greaterThanOrEqual(body.data.length);

      const ids = body.data.map((t: { id: string }) => t.id);
      expect(ids).to.contain('tag-1');
      expect(ids).to.contain('tag-2');
      expect(ids).to.contain('tag-3');
    });

    it('filters tags by query', async () => {
      const { body } = await supertest.get('/api/tags?query=least').expect(200);

      expect(body.meta.page).to.be(1);
      expect(body.meta.total).to.be(1);
      expect(body.data).to.have.length(1);
      expect(body.data[0].id).to.be('tag-3');
    });

    it('paginates tags when page/per_page are provided', async () => {
      const { body } = await supertest.get('/api/tags?page=1&per_page=2').expect(200);

      expect(body.meta.page).to.be(1);
      expect(body.meta.per_page).to.be(2);
      expect(body.meta.total).to.be.greaterThan(2);
      expect(body.data).to.have.length(2);
    });

    it('rejects invalid page/per_page values', async () => {
      await supertest.get('/api/tags?page=0').expect(400);
      await supertest.get('/api/tags?per_page=0').expect(400);
      await supertest.get('/api/tags?per_page=1001').expect(400);
    });
  });
}
