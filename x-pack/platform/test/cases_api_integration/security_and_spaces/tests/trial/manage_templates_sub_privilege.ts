/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import yaml from 'js-yaml';

import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { deleteAllCaseItems, getSpaceUrlPrefix } from '../../../common/lib/api';
import {
  secOnly,
  secOnlyManageTemplates,
  secOnlyNoManageTemplates,
} from '../../../common/lib/authentication/users';

const TEMPLATES_URL = '/internal/cases/templates';
const TEMPLATES_BULK_DELETE_URL = '/internal/cases/templates/_bulk_delete';

const buildCreateTemplateBody = (owner: string) => ({
  name: 'Test Template',
  owner,
  definition: yaml.dump({
    name: 'Test Template',
    fields: [{ control: 'INPUT_TEXT', name: 'field_one', label: 'Field One', type: 'keyword' }],
  }),
  isEnabled: true,
});

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('manageTemplates sub-privilege', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('createTemplate', () => {
      it('allows a user with the manageTemplates sub-privilege to create a template', async () => {
        const response = await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .auth(secOnlyManageTemplates.username, secOnlyManageTemplates.password)
          .set('kbn-xsrf', 'true')
          .send(buildCreateTemplateBody('securitySolutionFixture'))
          .expect(200);

        expect(response.body).to.have.property('templateId');
        expect(response.body.owner).to.eql('securitySolutionFixture');
      });

      it('allows a user with full cases access to create a template', async () => {
        const response = await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .auth(secOnly.username, secOnly.password)
          .set('kbn-xsrf', 'true')
          .send(buildCreateTemplateBody('securitySolutionFixture'))
          .expect(200);

        expect(response.body).to.have.property('templateId');
      });

      it('denies a user without the manageTemplates sub-privilege from creating a template', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .auth(secOnlyNoManageTemplates.username, secOnlyNoManageTemplates.password)
          .set('kbn-xsrf', 'true')
          .send(buildCreateTemplateBody('securitySolutionFixture'))
          .expect(403);
      });
    });

    describe('getAllTemplates', () => {
      let templateId: string;

      beforeEach(async () => {
        const createResp = await supertest
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .set('kbn-xsrf', 'true')
          .send(buildCreateTemplateBody('securitySolutionFixture'))
          .expect(200);

        templateId = createResp.body.templateId;
      });

      it('allows a user with the manageTemplates sub-privilege to list templates', async () => {
        const response = await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .query({ page: 1, perPage: 20 })
          .auth(secOnlyManageTemplates.username, secOnlyManageTemplates.password)
          .expect(200);

        expect(response.body.templates.length).to.be.greaterThan(0);
        expect(
          response.body.templates.some((t: { templateId: string }) => t.templateId === templateId)
        ).to.be(true);
      });

      it('allows a user without the manageTemplates sub-privilege to list templates', async () => {
        const response = await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .query({ page: 1, perPage: 20 })
          .auth(secOnlyNoManageTemplates.username, secOnlyNoManageTemplates.password)
          .expect(200);

        expect(response.body.templates.length).to.be.greaterThan(0);
        expect(
          response.body.templates.some((t: { templateId: string }) => t.templateId === templateId)
        ).to.be(true);
      });

      it('filters templates by owner when owner query param is provided', async () => {
        // Create a template for a different owner
        await supertest
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .set('kbn-xsrf', 'true')
          .send(buildCreateTemplateBody('observabilityFixture'))
          .expect(200);

        const response = await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .query({ page: 1, perPage: 20, owner: 'securitySolutionFixture' })
          .auth(secOnlyManageTemplates.username, secOnlyManageTemplates.password)
          .expect(200);

        for (const t of response.body.templates) {
          expect(t.owner).to.eql('securitySolutionFixture');
        }
      });
    });

    describe('updateTemplate', () => {
      let templateId: string;

      beforeEach(async () => {
        const createResp = await supertest
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .set('kbn-xsrf', 'true')
          .send(buildCreateTemplateBody('securitySolutionFixture'))
          .expect(200);

        templateId = createResp.body.templateId;
      });

      it('allows a user with the manageTemplates sub-privilege to update a template', async () => {
        await supertestWithoutAuth
          .put(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}/${templateId}`)
          .auth(secOnlyManageTemplates.username, secOnlyManageTemplates.password)
          .set('kbn-xsrf', 'true')
          .send({
            owner: 'securitySolutionFixture',
            definition: yaml.dump({
              name: 'Updated',
              fields: [{ control: 'INPUT_TEXT', name: 'f', label: 'F', type: 'keyword' }],
            }),
          })
          .expect(200);
      });

      it('denies a user without the manageTemplates sub-privilege from updating a template', async () => {
        await supertestWithoutAuth
          .put(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}/${templateId}`)
          .auth(secOnlyNoManageTemplates.username, secOnlyNoManageTemplates.password)
          .set('kbn-xsrf', 'true')
          .send({
            owner: 'securitySolutionFixture',
            definition: yaml.dump({
              name: 'Updated',
              fields: [{ control: 'INPUT_TEXT', name: 'f', label: 'F', type: 'keyword' }],
            }),
          })
          .expect(403);
      });
    });

    describe('deleteTemplate', () => {
      let templateId: string;

      beforeEach(async () => {
        const createResp = await supertest
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .set('kbn-xsrf', 'true')
          .send(buildCreateTemplateBody('securitySolutionFixture'))
          .expect(200);

        templateId = createResp.body.templateId;
      });

      it('allows a user with the manageTemplates sub-privilege to delete a template', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_BULK_DELETE_URL}`)
          .auth(secOnlyManageTemplates.username, secOnlyManageTemplates.password)
          .set('kbn-xsrf', 'true')
          .send({ ids: [templateId] })
          .expect(204);
      });

      it('denies a user without the manageTemplates sub-privilege from deleting a template', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_BULK_DELETE_URL}`)
          .auth(secOnlyNoManageTemplates.username, secOnlyNoManageTemplates.password)
          .set('kbn-xsrf', 'true')
          .send({ ids: [templateId] })
          .expect(403);
      });
    });
  });
};
