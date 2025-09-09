/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('POST /api/chat/converse', function () {
    it('returns 400 when payload is invalid (missing input)', async () => {
      const res = await supertest
        .post('/api/chat/converse')
        .set('kbn-xsrf', 'true')
        .send({})
        .expect(400);

      // Basic shape assertion
      expect(res.body).to.be.an('object');
    });
  });
}
