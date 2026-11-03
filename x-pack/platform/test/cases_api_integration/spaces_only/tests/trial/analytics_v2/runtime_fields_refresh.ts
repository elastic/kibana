/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify as yamlStringify } from 'yaml';
import {
  INTERNAL_BULK_DELETE_TEMPLATES_URL,
  INTERNAL_FIELD_DEFINITIONS_URL,
  INTERNAL_TEMPLATES_URL,
} from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, deleteAllCaseItems } from '../../../../common/lib/api';
import { DATA_VIEW_ID_PREFIX, resetV2 } from './helpers';

const OWNER = 'securitySolutionFixture';
const TEMPLATE_NAME = 'Analytics template';
const DATA_VIEW_URL = `/api/data_views/data_view/${DATA_VIEW_ID_PREFIX}default`;
const REFRESH_TIMEOUT_MS = 15_000;

const keywordField = (name: string) => ({
  name,
  type: 'keyword',
  control: 'INPUT_TEXT',
  label: name,
});

const templateDefinition = (inlineFieldName: string): string =>
  yamlStringify({
    name: TEMPLATE_NAME,
    fields: [keywordField(inlineFieldName), { $ref: 'library_field' }],
  });

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');

  const getRuntimeFieldTypes = async (): Promise<Record<string, string>> => {
    const { body } = await supertest.get(DATA_VIEW_URL).expect(200);
    const runtimeFieldMap: Record<string, { type: string }> = body.data_view.runtimeFieldMap;

    return Object.fromEntries(
      Object.entries(runtimeFieldMap).map(([name, { type }]) => [name, type])
    );
  };

  const expectRuntimeFields = (expected: Record<string, string>): Promise<void> =>
    retry.tryForTime(REFRESH_TIMEOUT_MS, async () => {
      expect(await getRuntimeFieldTypes()).to.eql(expected);
    });

  const createFieldDefinition = async (name: string, isGlobal: boolean): Promise<string> => {
    const { body } = await supertest
      .post(INTERNAL_FIELD_DEFINITIONS_URL)
      .set('kbn-xsrf', 'true')
      .send({ name, owner: OWNER, isGlobal, definition: yamlStringify(keywordField(name)) })
      .expect(200);

    return body.fieldDefinitionId;
  };

  describe('runtime fields refresh', () => {
    beforeEach(async () => {
      // Bootstraps the data view and warms the per-request ensure cache, so later changes can
      // only reach the data view through the template and field definition refresh hooks.
      await createCase(supertest, getPostCaseRequest());
      await expectRuntimeFields({});
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await resetV2(supertest);
    });

    it('syncs runtime fields with template create, update and delete', async () => {
      await createFieldDefinition('library_field', false);

      const { body: template } = await supertest
        .post(INTERNAL_TEMPLATES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          name: TEMPLATE_NAME,
          owner: OWNER,
          definition: templateDefinition('before_field'),
          isEnabled: true,
        })
        .expect(200);

      await expectRuntimeFields({
        'case.before_field_as_keyword': 'keyword',
        'case.library_field_as_keyword': 'keyword',
      });

      await supertest
        .patch(`${INTERNAL_TEMPLATES_URL}/${template.templateId}`)
        .set('kbn-xsrf', 'true')
        .send({ definition: templateDefinition('after_field') })
        .expect(200);

      await expectRuntimeFields({
        'case.after_field_as_keyword': 'keyword',
        'case.library_field_as_keyword': 'keyword',
      });

      await supertest
        .post(INTERNAL_BULK_DELETE_TEMPLATES_URL)
        .set('kbn-xsrf', 'true')
        .send({ ids: [template.templateId] })
        .expect(204);

      await expectRuntimeFields({});
    });

    it('syncs runtime fields with global field definition create and delete', async () => {
      const fieldDefinitionId = await createFieldDefinition('global_field', true);

      await expectRuntimeFields({ 'case.global_field_as_keyword': 'keyword' });

      await supertest
        .delete(`${INTERNAL_FIELD_DEFINITIONS_URL}/${fieldDefinitionId}`)
        .set('kbn-xsrf', 'true')
        .expect(204);

      await expectRuntimeFields({});
    });
  });
};
