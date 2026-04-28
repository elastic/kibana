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

  describe('POST /api/tags', () => {
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

    it('creates a tag (201)', async () => {
      const createResponse = await supertest
        .post(`/api/tags`)
        .send({
          name: 'my new tag',
          description: 'some desc',
          color: '#772299',
        })
        .expect(201);

      const newTagId = createResponse.body.id;
      expect(createResponse.body.data).to.eql({
        name: 'my new tag',
        description: 'some desc',
        color: '#772299',
      });
      expect(createResponse.body.meta).to.have.property('managed', false);

      await supertest
        .get(`/api/tags/${newTagId}`)
        .expect(200)
        .then(({ body }) => {
          expect(body.id).to.eql(newTagId);
          expect(body.data).to.eql({
            name: 'my new tag',
            description: 'some desc',
            color: '#772299',
          });
          expect(body.meta).to.have.property('managed', false);
        });

      await supertest.delete(`/api/tags/${newTagId}`).expect(204);
    });

    it('creates a tag with a generated color when omitted (201)', async () => {
      const createResponse = await supertest
        .post(`/api/tags`)
        .send({
          name: 'tag without color',
        })
        .expect(201);

      expect(createResponse.body.data).to.eql({
        name: 'tag without color',
        color: createResponse.body.data.color,
      });
      expect(createResponse.body.data).to.not.have.property('description');
      expect(createResponse.body.data.color).to.match(/^#[0-9a-f]{6}$/i);

      await supertest.delete(`/api/tags/${createResponse.body.id}`).expect(204);
    });

    it('returns details when validation fails (400)', async () => {
      await supertest
        .post(`/api/tags`)
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

    it('returns 409 when name already exists', async () => {
      const existingName = 'tag-1';
      await supertest
        .post(`/api/tags`)
        .send({
          name: existingName,
          description: 'some desc',
          color: '#000000',
        })
        .expect(409)
        .then(({ body }) => {
          expect(body).to.eql({
            message: `A tag with the name "${existingName}" already exists.`,
          });
        });
    });
  });
}
