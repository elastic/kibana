/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LENS_VIS_API_PATH, LENS_API_VERSION } from '@kbn/lens-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { LensSearchResponseBody } from '@kbn/lens-plugin/server';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('should get list of lens visualizations', async () => {
      const response = await supertest
        .get(LENS_VIS_API_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send();

      expect(response.status).to.be(200);

      const body: LensSearchResponseBody = response.body;
      expect(body.data.length).to.be(4);
    });

    it('should filter lens visualizations by title and description', async () => {
      const response = await supertest
        .get(LENS_VIS_API_PATH)
        .query({ query: '1' })
        .set(ELASTIC_HTTP_VERSION_HEADER, LENS_API_VERSION)
        .send();

      expect(response.status).to.be(200);

      const body: LensSearchResponseBody = response.body;
      expect(body.data.length).to.be(2);
    });
  });
}
