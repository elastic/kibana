/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify } from 'yaml';

import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { deleteAllCaseItems, getSpaceUrlPrefix } from '../../../common/lib/api';

const TEMPLATES_URL = '/internal/cases/templates';

const buildCreateTemplateBody = (owner: string) => ({
  name: 'Test Template',
  owner,
  definition: stringify({
    name: 'Test Template',
    fields: [{ control: 'INPUT_TEXT', name: 'field_one', label: 'Field One', type: 'keyword' }],
  }),
  isEnabled: true,
});

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('templates input validation and identity derivation', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const createTemplate = async (): Promise<string> => {
      const resp = await supertest
        .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildCreateTemplateBody('securitySolutionFixture'))
        .expect(200);
      return resp.body.templateId;
    };

    it('rejects a PATCH whose description exceeds the max length with 400', async () => {
      const templateId = await createTemplate();
      await supertest
        .patch(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}/${templateId}`)
        .set('kbn-xsrf', 'true')
        .send({ description: 'x'.repeat(1001) }) // MAX_TEMPLATE_DESCRIPTION_LENGTH = 1000
        .expect(400);
    });

    it('rejects a PATCH with more tags than allowed with 400', async () => {
      const templateId = await createTemplate();
      await supertest
        .patch(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}/${templateId}`)
        .set('kbn-xsrf', 'true')
        .send({ tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`) }) // MAX_TAGS_PER_TEMPLATE = 10
        .expect(400);
    });

    it('rejects a PATCH with an empty-string tag with 400', async () => {
      const templateId = await createTemplate();
      await supertest
        .patch(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}/${templateId}`)
        .set('kbn-xsrf', 'true')
        .send({ tags: [''] })
        .expect(400);
    });

    it('derives the template name from the definition when the POST body omits name', async () => {
      const response = await supertest
        .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .send({
          owner: 'securitySolutionFixture',
          definition: stringify({
            name: 'Derived from definition',
            fields: [{ control: 'INPUT_TEXT', name: 'f', label: 'F', type: 'keyword' }],
          }),
          isEnabled: true,
        })
        .expect(200);

      expect(response.body.name).to.eql('Derived from definition');
    });

    describe('template name uniqueness', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      const postTemplate = (body: Record<string, unknown>) =>
        supertest
          .post(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}`)
          .set('kbn-xsrf', 'true')
          .send(body);

      it('rejects a second template with a duplicate name for the same owner (case-insensitive) with 409', async () => {
        await postTemplate(buildCreateTemplateBody('securitySolutionFixture')).expect(200);

        // Same owner, name differing only by case — the case-default title inside the definition can
        // repeat, but the template metadata name must be unique per owner.
        await postTemplate({
          name: 'test template',
          owner: 'securitySolutionFixture',
          definition: stringify({
            name: 'A different case title',
            fields: [{ control: 'INPUT_TEXT', name: 'f', label: 'F', type: 'keyword' }],
          }),
          isEnabled: true,
        }).expect(409);
      });

      it('allows the same template name for a different owner', async () => {
        await postTemplate(buildCreateTemplateBody('securitySolutionFixture')).expect(200);
        await postTemplate(buildCreateTemplateBody('observabilityFixture')).expect(200);
      });

      it('allows updating a template to its own current name via PUT', async () => {
        const created = await postTemplate(
          buildCreateTemplateBody('securitySolutionFixture')
        ).expect(200);
        const { templateId } = created.body;

        // Re-saving the same identity name for the same template must not collide with itself.
        await supertest
          .put(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}/${templateId}`)
          .set('kbn-xsrf', 'true')
          .send({
            name: 'Test Template',
            owner: 'securitySolutionFixture',
            definition: stringify({
              name: 'Updated case title',
              fields: [{ control: 'INPUT_TEXT', name: 'f', label: 'F', type: 'keyword' }],
            }),
            isEnabled: true,
          })
          .expect(200);
      });

      it('rejects renaming a template to another existing name with 409', async () => {
        await postTemplate({
          name: 'First Template',
          owner: 'securitySolutionFixture',
          definition: stringify({
            name: 'First case title',
            fields: [{ control: 'INPUT_TEXT', name: 'f', label: 'F', type: 'keyword' }],
          }),
          isEnabled: true,
        }).expect(200);

        const second = await postTemplate({
          name: 'Second Template',
          owner: 'securitySolutionFixture',
          definition: stringify({
            name: 'Second case title',
            fields: [{ control: 'INPUT_TEXT', name: 'f', label: 'F', type: 'keyword' }],
          }),
          isEnabled: true,
        }).expect(200);

        await supertest
          .patch(`${getSpaceUrlPrefix('space1')}${TEMPLATES_URL}/${second.body.templateId}`)
          .set('kbn-xsrf', 'true')
          .send({ name: 'First Template' })
          .expect(409);
      });
    });
  });
};
