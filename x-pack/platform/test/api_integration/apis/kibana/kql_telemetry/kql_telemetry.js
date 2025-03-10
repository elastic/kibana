/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KQL_TELEMETRY_ROUTE_LATEST_VERSION } from '@kbn/data-plugin/common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export default function ({ getService }) {
  const supertestNoAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');

  describe('telemetry API', () => {
    describe('no auth', () => {
      it('should return 401', async () => {
        return supertestNoAuth
          .post('/internal/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set('kbn-xsrf', 'much access')
          .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
          .send({ opt_in: true })
          .expect(401);
      });
    });

    describe('with auth', () => {
      it('should return 200 for a successful request', async () => {
        return supertest
          .post('/internal/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set('kbn-xsrf', 'such token, wow')
          .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
          .send({ opt_in: true })
          .expect('Content-Type', /json/)
          .expect(200)
          .then(({ body }) => {
            expect(body.success).to.be(true);
          });
      });
    });
  });
}
