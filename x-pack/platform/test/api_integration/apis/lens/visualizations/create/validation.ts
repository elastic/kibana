/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LENS_VIS_API_PATH, LENS_API_VERSION } from '@kbn/lens-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('validation', () => {
    it('should return error if body is empty', async () => {
      const response = await supertest
        .post(LENS_VIS_API_PATH)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send({});

      expect(response.status).to.be(400);
      expect(response.body.message).to.be(
        '[request body]: types that failed validation:\n- [request body.0.references]: expected value of type [array] but got [undefined]\n- [request body.1.references]: expected value of type [array] but got [undefined]'
      );
    });
  });
}
