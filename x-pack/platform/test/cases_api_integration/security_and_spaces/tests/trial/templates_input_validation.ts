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
  });
};
