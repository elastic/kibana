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
  describe('updated_by', function () {
    describe('for not interactive user', function () {
      const supertest = getService('supertest');
      it('updated_by is empty', async () => {
        const createResponse = await supertest
          .post('/api/content_management/rpc/create')
          .set('kbn-xsrf', 'true')
          .send(sampleDashboard);

        expect(createResponse.status).to.be(200);
        expect(createResponse.body.result.result.item).to.be.ok();
        expect(createResponse.body.result.result.item).to.not.have.key('updatedBy');

        const updateResponse = await supertest
          .post('/api/content_management/rpc/update')
          .set('kbn-xsrf', 'true')
          .send({
            contentTypeId: sampleDashboard.contentTypeId,
            version: sampleDashboard.version,
            options: {
              references: [],
              mergeAttributes: false,
            },
            id: createResponse.body.result.result.item.id,
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);
        expect(updateResponse.body.result.result.item).to.be.ok();

        const getResponse = await supertest
          .post('/api/content_management/rpc/get')
          .set('kbn-xsrf', 'true')
          .send({
            id: createResponse.body.result.result.item.id,
            contentTypeId: sampleDashboard.contentTypeId,
            version: sampleDashboard.version,
          });

        expect(getResponse.status).to.be(200);
        expect(getResponse.body.result.result.item).to.be.ok();
        expect(getResponse.body.result.result.item).to.not.have.key('updatedBy');
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
          .post('/api/content_management/rpc/create')
          .set(interactiveUser.headers)
          .set('kbn-xsrf', 'true')
          .send(sampleDashboard);
      });

      after(async () => {
        await cleanupInteractiveUser({ getService });
      });

      it('updated_by is with profile_id', async () => {
        expect(createResponse.status).to.be(200);
        expect(createResponse.body.result.result.item).to.be.ok();
        expect(createResponse.body.result.result.item).to.have.key('updatedBy');
        expect(createResponse.body.result.result.item.updatedBy).to.be(interactiveUser.uid);
      });

      it('updated_by is empty after update with non interactive user', async () => {
        const updateResponse = await supertestWithAuth
          .post('/api/content_management/rpc/update')
          .set('kbn-xsrf', 'true')
          .send({
            contentTypeId: sampleDashboard.contentTypeId,
            version: sampleDashboard.version,
            options: {
              references: [],
              mergeAttributes: false,
            },
            id: createResponse.body.result.result.item.id,
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);

        const getResponse = await supertestWithAuth
          .post('/api/content_management/rpc/get')
          .set('kbn-xsrf', 'true')
          .send({
            id: createResponse.body.result.result.item.id,
            contentTypeId: sampleDashboard.contentTypeId,
            version: sampleDashboard.version,
          });

        expect(getResponse.status).to.be(200);
        expect(getResponse.body.result.result.item).to.be.ok();

        const createdObject = createResponse.body.result.result.item;
        const updatedObject = getResponse.body.result.result.item;

        expect(updatedObject).to.not.have.key('updatedBy');
        expect(updatedObject.createdBy).to.eql(createdObject.createdBy);
        expect(updatedObject.createdAt).to.eql(createdObject.createdAt);
        expect(updatedObject.updatedAt).to.be.greaterThan(createdObject.updatedAt);
      });

      it('updated_by is with profile_id of another user after update', async () => {
        const interactiveUser2 = await loginAsInteractiveUser({
          getService,
          username: 'content_manager_dashboard_2',
        });

        const updateResponse = await supertestWithoutAuth
          .post('/api/content_management/rpc/update')
          .set(interactiveUser2.headers)
          .set('kbn-xsrf', 'true')
          .send({
            contentTypeId: sampleDashboard.contentTypeId,
            version: sampleDashboard.version,
            options: {
              references: [],
              mergeAttributes: false,
            },
            id: createResponse.body.result.result.item.id,
            data: {
              title: 'updated title',
            },
          });

        expect(updateResponse.status).to.be(200);

        const getResponse = await supertestWithAuth
          .post('/api/content_management/rpc/get')
          .set('kbn-xsrf', 'true')
          .send({
            id: createResponse.body.result.result.item.id,
            contentTypeId: sampleDashboard.contentTypeId,
            version: sampleDashboard.version,
          });

        expect(getResponse.status).to.be(200);
        expect(getResponse.body.result.result.item).to.be.ok();

        const createdObject = createResponse.body.result.result.item;
        const updatedObject = getResponse.body.result.result.item;

        expect(updatedObject).to.have.key('updatedBy');
        expect(updatedObject.updatedBy).to.not.eql(createdObject.updatedBy);
        expect(updatedObject.createdBy).to.eql(interactiveUser.uid);
        expect(updatedObject.updatedBy).to.eql(interactiveUser2.uid);
        expect(updatedObject.createdAt).to.eql(createdObject.createdAt);
        expect(updatedObject.updatedAt).to.be.greaterThan(createdObject.updatedAt);
      });
    });
  });
}
