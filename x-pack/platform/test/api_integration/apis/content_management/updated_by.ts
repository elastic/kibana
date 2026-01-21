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
  describe('updated_by', function () {
    describe('for not interactive user', function () {
      const supertest = getService('supertest');
      it('updated_by is empty', async () => {
        const createResponse = await supertest
          .post(DASHBOARD_API_PATH)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'Sample dashboard',
            },
          });

        expect(createResponse.status).to.be(200);
        expect(createResponse.body.data).to.be.ok();
        expect(createResponse.body.meta).to.not.have.key('updated_by');

        const updateResponse = await supertest
          .put(`${DASHBOARD_API_PATH}/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);
        expect(updateResponse.body.data).to.be.ok();
        expect(updateResponse.body.meta).to.not.have.key('updated_by');
      });
    });

    describe('for interactive user', function () {
      const supertestWithoutAuth = getService('supertestWithoutAuth');
      const supertestWithAuth = getService('supertest');
      let interactiveUser: LoginAsInteractiveUserResponse;
      let createResponse: any;

      before(async () => {
        await setupInteractiveUser({ getService });
        interactiveUser = await loginAsInteractiveUser({ getService });
      });

      beforeEach(async () => {
        createResponse = await supertestWithoutAuth
          .post(DASHBOARD_API_PATH)
          .set(interactiveUser.headers)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'Sample dashboard',
            },
          });
      });

      after(async () => {
        await cleanupInteractiveUser({ getService });
      });

      it('updated_by is with profile_id', async () => {
        expect(createResponse.status).to.be(200);
        expect(createResponse.body.data).to.be.ok();
        expect(createResponse.body.meta).to.have.key('updated_by');
        expect(createResponse.body.meta.updated_by).to.be(interactiveUser.uid);
      });

      it('updated_by is empty after update with non interactive user', async () => {
        const updateResponse = await supertestWithAuth
          .put(`${DASHBOARD_API_PATH}/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);

        const getResponse = await supertestWithAuth
          .get(`${DASHBOARD_API_PATH}/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send();

        expect(getResponse.status).to.be(200);
        expect(getResponse.body.data).to.be.ok();

        const createdMeta = createResponse.body.meta;
        const getMeta = getResponse.body.meta;

        expect(getMeta).to.not.have.key('updated_by');
        expect(getMeta.created_by).to.eql(createdMeta.created_by);
        expect(getMeta.created_at).to.eql(createdMeta.created_at);
        expect(getMeta.updated_at).to.be.greaterThan(createdMeta.updated_at);
      });

      it('updated_by is with profile_id of another user after update', async () => {
        const interactiveUser2 = await loginAsInteractiveUser({
          getService,
          username: 'content_manager_dashboard_2',
        });

        const updateResponse = await supertestWithoutAuth
          .put(`${DASHBOARD_API_PATH}/${createResponse.body.id}`)
          .set(interactiveUser2.headers)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);

        const getResponse = await supertestWithAuth
          .get(`${DASHBOARD_API_PATH}/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send();

        expect(getResponse.status).to.be(200);
        expect(getResponse.body.data).to.be.ok();

        const createdMeta = createResponse.body.meta;
        const getMeta = getResponse.body.meta;

        expect(getMeta).to.have.key('updated_by');
        expect(getMeta.updated_by).to.not.eql(createdMeta.updated_by);
        expect(getMeta.created_by).to.eql(interactiveUser.uid);
        expect(getMeta.updated_by).to.eql(interactiveUser2.uid);
        expect(getMeta.created_at).to.eql(createdMeta.created_at);
        expect(getMeta.updated_at).to.be.greaterThan(createdMeta.updated_at);
      });
    });
  });
}
