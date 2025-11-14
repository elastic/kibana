/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { LoginAsInteractiveUserResponse } from './helpers';
import {
  loginAsInteractiveUser,
  setupInteractiveUser,
  cleanupInteractiveUser,
} from './helpers';

export default function ({ getService }: FtrProviderContext) {
  describe('updated_by', function () {
    describe('for not interactive user', function () {
      const supertest = getService('supertest');
      it('updated_by is empty', async () => {
        const createResponse = await supertest
          .post('/api/dashboards/dashboard')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'Sample dashboard',
            },
          });

        expect(createResponse.status).to.be(200);
        expect(createResponse.body.data).to.be.ok();
        expect(createResponse.body.meta).to.not.have.key('updatedBy');

        const updateResponse = await supertest
          .put(`/api/dashboards/dashboard/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);
        expect(updateResponse.body.data).to.be.ok();
        expect(updateResponse.body.meta).to.not.have.key('updatedBy');
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
          .post('/api/dashboards/dashboard')
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
        expect(createResponse.body.meta).to.have.key('updatedBy');
        expect(createResponse.body.meta.updatedBy).to.be(interactiveUser.uid);
      });

      it('updated_by is empty after update with non interactive user', async () => {
        const updateResponse = await supertestWithAuth
          .put(`/api/dashboards/dashboard/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send({
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);

        const getResponse = await supertestWithAuth
          .get(`/api/dashboards/dashboard/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send();

        expect(getResponse.status).to.be(200);
        expect(getResponse.body.data).to.be.ok();

        const createdMeta = createResponse.body.meta;
        const getMeta = getResponse.body.meta;

        expect(getMeta).to.not.have.key('updatedBy');
        expect(getMeta.createdBy).to.eql(createdMeta.createdBy);
        expect(getMeta.createdAt).to.eql(createdMeta.createdAt);
        expect(getMeta.updatedAt).to.be.greaterThan(createdMeta.updatedAt);
      });

      it('updated_by is with profile_id of another user after update', async () => {
        const interactiveUser2 = await loginAsInteractiveUser({
          getService,
          username: 'content_manager_dashboard_2',
        });

        const updateResponse = await supertestWithoutAuth
          .put(`/api/dashboards/dashboard/${createResponse.body.id}`)
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
          .get(`/api/dashboards/dashboard/${createResponse.body.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .send();

        expect(getResponse.status).to.be(200);
        expect(getResponse.body.data).to.be.ok();

        const createdMeta = createResponse.body.meta;
        const getMeta = getResponse.body.meta;

        expect(getMeta).to.have.key('updatedBy');
        expect(getMeta.updatedBy).to.not.eql(createdMeta.updatedBy);
        expect(getMeta.createdBy).to.eql(interactiveUser.uid);
        expect(getMeta.updatedBy).to.eql(interactiveUser2.uid);
        expect(getMeta.createdAt).to.eql(createdMeta.createdAt);
        expect(getMeta.updatedAt).to.be.greaterThan(createdMeta.updatedAt);
      });
    });
  });
}
