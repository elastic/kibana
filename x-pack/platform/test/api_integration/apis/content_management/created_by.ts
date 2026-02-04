/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DASHBOARD_API_PATH } from '@kbn/dashboard-plugin/server';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { LoginAsInteractiveUserResponse } from './helpers';
import { loginAsInteractiveUser, setupInteractiveUser, cleanupInteractiveUser } from './helpers';

export default function ({ getService }: FtrProviderContext) {
  describe('created_by', function () {
    describe('for not interactive user', function () {
      const supertest = getService('supertest');
      it('created_by is empty', async () => {
        const { body, status } = await supertest
          .post(DASHBOARD_API_PATH)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'Sample dashboard',
            },
          });

        expect(status).to.be(200);
        expect(body.data).to.be.ok();
        expect(body.meta).to.not.have.key('created_by');
      });
    });

    describe('for interactive user', function () {
      const supertest = getService('supertestWithoutAuth');
      let interactiveUser: LoginAsInteractiveUserResponse;

      before(async () => {
        await setupInteractiveUser({ getService });
        interactiveUser = await loginAsInteractiveUser({ getService });
      });

      after(async () => {
        await cleanupInteractiveUser({ getService });
      });

      it('created_by is with profile_id', async () => {
        const createResponse = await supertest
          .post(DASHBOARD_API_PATH)
          .set(interactiveUser.headers)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'Sample dashboard',
            },
          });

        expect(createResponse.status).to.be(200);
        expect(createResponse.body.data).to.be.ok();
        expect(createResponse.body.meta).to.have.key('created_by');
        expect(createResponse.body.meta.created_by).to.be(interactiveUser.uid);
      });
    });
  });
}
