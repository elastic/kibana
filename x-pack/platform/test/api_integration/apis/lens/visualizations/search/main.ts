/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PUBLIC_API_PATH, PUBLIC_API_VERSION } from '@kbn/lens-plugin/server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('should get list of lens visualizations', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}/visualizations`)
        .set(ELASTIC_HTTP_VERSION_HEADER, PUBLIC_API_VERSION)
        .send();

      expect(response.status).to.be(200);
      expect(response.body.length).to.be(4);
    });

    it('should filter lens visualizations by title and description', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}/visualizations`)
        .query({ query: '1' })
        .set(ELASTIC_HTTP_VERSION_HEADER, PUBLIC_API_VERSION)
        .send();

      expect(response.status).to.be(200);
      expect(response.body.length).to.be(2);
    });
  });
}
