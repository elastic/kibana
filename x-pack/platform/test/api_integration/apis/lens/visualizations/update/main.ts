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

    it('should error when updating an unknown lens visualization', async () => {
      const id = '123'; // unknown id
      const response = await supertest
        .put(`${LENS_VIS_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send(getExampleLensBody('Custom title'));

      expect(response.status).to.be(404);
      expect(response.body.message).to.be('A Lens visualization with id [123] was not found.');
    });
  });
}
