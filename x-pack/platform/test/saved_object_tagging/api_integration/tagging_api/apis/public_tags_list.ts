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

  describe('GET /api/tags', () => {
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

    it('returns all tags when called without query parameters', async () => {
      const { body } = await supertest.get('/api/tags').expect(200);

      expect(body.page).to.be(1);
      expect(body.total).to.be(body.tags.length);

      const ids = body.tags.map((t: { id: string }) => t.id);
      expect(ids).to.contain('tag-1');
      expect(ids).to.contain('tag-2');
      expect(ids).to.contain('tag-3');
    });

    it('filters tags by query', async () => {
      const { body } = await supertest.get('/api/tags?query=least').expect(200);

      expect(body.page).to.be(1);
      expect(body.total).to.be(1);
      expect(body.tags).to.have.length(1);
      expect(body.tags[0].id).to.be('tag-3');
    });

    it('paginates tags when page/per_page are provided', async () => {
      const { body } = await supertest.get('/api/tags?page=1&per_page=2').expect(200);

      expect(body.page).to.be(1);
      expect(body.total).to.be.greaterThan(2);
      expect(body.tags).to.have.length(2);
    });

    it('rejects invalid page/per_page values', async () => {
      await supertest.get('/api/tags?page=0').expect(400);
      await supertest.get('/api/tags?per_page=0').expect(400);
      await supertest.get('/api/tags?per_page=1001').expect(400);
    });
  });
}
