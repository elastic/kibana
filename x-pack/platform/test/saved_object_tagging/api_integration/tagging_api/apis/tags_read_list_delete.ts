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

  describe('GET/DELETE /api/tags', () => {
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

    it('lists tags (200)', async () => {
      await supertest
        .get('/api/tags')
        .expect(200)
        .then(({ body }) => {
          if (!Array.isArray(body.tags)) {
            throw new Error('Expected body.tags to be an array');
          }
          if (typeof body.total !== 'number') {
            throw new Error('Expected body.total to be a number');
          }
          if (typeof body.page !== 'number') {
            throw new Error('Expected body.page to be a number');
          }
        });
    });

    it('returns 404 when tag does not exist', async () => {
      const id = 'does-not-exist';
      await supertest
        .get(`/api/tags/${id}`)
        .expect(404)
        .then(({ body }) => {
          expect(body).to.eql({
            message: `A tag with ID [${id}] was not found.`,
          });
        });
    });

    it('returns 404 when deleting a missing tag', async () => {
      const id = 'does-not-exist';
      await supertest
        .delete(`/api/tags/${id}`)
        .expect(404)
        .then(({ body }) => {
          expect(body).to.eql({
            message: `A tag with ID [${id}] was not found.`,
          });
        });
    });
  });
}
