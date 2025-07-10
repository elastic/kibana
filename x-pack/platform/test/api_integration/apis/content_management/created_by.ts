/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  loginAsInteractiveUser,
  setupInteractiveUser,
  sampleDashboard,
  cleanupInteractiveUser,
  LoginAsInteractiveUserResponse,
} from './helpers';

export default function ({ getService }: FtrProviderContext) {
  describe('created_by', function () {
    describe('for not interactive user', function () {
      const supertest = getService('supertest');
      it('created_by is empty', async () => {
        const { body, status } = await supertest
          .post('/api/content_management/rpc/create')
          .set('kbn-xsrf', 'true')
          .send(sampleDashboard);

        expect(status).to.be(200);
        expect(body.result.result.item).to.be.ok();
        expect(body.result.result.item).to.not.have.key('createdBy');
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
          .post('/api/content_management/rpc/create')
          .set(interactiveUser.headers)
          .set('kbn-xsrf', 'true')
          .send(sampleDashboard);

        expect(createResponse.status).to.be(200);
        expect(createResponse.body.result.result.item).to.be.ok();
        expect(createResponse.body.result.result.item).to.have.key('createdBy');
        expect(createResponse.body.result.result.item.createdBy).to.be(interactiveUser.uid);
      });
    });
  });
}
