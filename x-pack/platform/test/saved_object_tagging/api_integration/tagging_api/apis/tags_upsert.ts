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

  describe('PUT /api/tags/{id}', () => {
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

    it('updates an existing tag (200)', async () => {
      await supertest
        .put(`/api/tags/tag-1`)
        .send({
          name: 'updated name',
          description: 'updated desc',
          color: '#123456',
        })
        .expect(200)
        .then(({ body }) => {
          expect(body.id).to.eql('tag-1');
          expect(body.data).to.eql({
            name: 'updated name',
            description: 'updated desc',
            color: '#123456',
          });
          expect(body.meta).to.have.property('managed', false);
        });

      await supertest
        .get(`/api/tags/tag-1`)
        .expect(200)
        .then(({ body }) => {
          expect(body.id).to.eql('tag-1');
          expect(body.data).to.eql({
            name: 'updated name',
            description: 'updated desc',
            color: '#123456',
          });
          expect(body.meta).to.have.property('managed', false);
        });
    });

    it('creates a tag at the provided id (201)', async () => {
      const id = 'created-via-put';
      await supertest
        .put(`/api/tags/${id}`)
        .send({
          name: 'created name',
          description: 'created desc',
          color: '#654321',
        })
        .expect(201)
        .then(({ body }) => {
          expect(body.id).to.eql(id);
          expect(body.data).to.eql({
            name: 'created name',
            description: 'created desc',
            color: '#654321',
          });
          expect(body.meta).to.have.property('managed', false);
        });

      await supertest.get(`/api/tags/${id}`).expect(200);
      await supertest.delete(`/api/tags/${id}`).expect(204);
    });

    it('returns 409 when updating to an existing name', async () => {
      const existingName = 'tag-3';
      await supertest
        .put(`/api/tags/tag-2`)
        .send({
          name: existingName,
          description: 'updated desc',
          color: '#123456',
        })
        .expect(409)
        .then(({ body }) => {
          expect(body).to.eql({
            message: `A tag with the name "${existingName}" already exists.`,
          });
        });
    });

    it('returns details when validation fails (400)', async () => {
      await supertest
        .put(`/api/tags/tag-1`)
        .send({
          name: 'a',
          description: 'some desc',
          color: 'this is not a valid color',
        })
        .expect(400)
        .then(({ body }) => {
          expect(body).to.eql({
            message: 'Error validating tag attributes',
            attributes: {
              valid: false,
              warnings: [],
              errors: {
                name: 'Tag name must be at least 2 characters',
                color: 'Tag color must be a valid hex color',
              },
            },
          });
        });
    });
  });
}
