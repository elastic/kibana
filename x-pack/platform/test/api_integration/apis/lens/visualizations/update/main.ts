/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LENS_VIS_API_PATH, LENS_API_VERSION } from '@kbn/lens-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { LensUpdateResponseBody } from '@kbn/lens-plugin/server';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { getExampleLensBody } from '../../examples';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('should update a lens visualization', async () => {
      const id = '71c9c185-3e6d-49d0-b7e5-f966eaf51625'; // known id
      const response = await supertest
        .put(`${LENS_VIS_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send(getExampleLensBody('Custom title'));

      expect(response.status).to.be(200);

      const body: LensUpdateResponseBody = response.body;
      expect(body.data.title).to.be('Custom title');
    });

    it('should upsert when no lens visualization exists for the id', async () => {
      const id = '123'; // id without an existing visualization
      const response = await supertest
        .put(`${LENS_VIS_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send(getExampleLensBody('Upsert title'));

      expect(response.status).to.be(201);

      const body: LensUpdateResponseBody = response.body;
      expect(body.id).to.be(id);
      expect(body.data.title).to.be('Upsert title');
    });

    it('should validate id on creation', async () => {
      const id = 'invalid-id__$-UPPERCASE';
      const response = await supertest
        .put(`${LENS_VIS_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send(getExampleLensBody('Some title'));

      expect(response.status).to.be(400);
      expect(response.body.message).to.be(
        'ID must contain only lowercase letters, numbers, hyphens, and underscores.'
      );
    });
  });
}
