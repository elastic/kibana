/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LENS_VIS_API_PATH, LENS_API_VERSION } from '@kbn/lens-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { LensCreateResponseBody } from '@kbn/lens-plugin/server';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { getExampleLensBody } from '../../examples';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('should create a lens visualization', async () => {
      const response = await supertest
        .post(LENS_VIS_API_PATH)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send(getExampleLensBody(undefined, 'new lens vis'));

      expect(response.status).to.be(201);

      const body: LensCreateResponseBody = response.body;
      expect(body.data.description).to.be('new lens vis');
    });
  });
}
