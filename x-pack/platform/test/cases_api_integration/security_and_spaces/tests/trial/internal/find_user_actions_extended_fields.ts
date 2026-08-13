/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify as yamlStringify } from 'yaml';
import { CASES_URL, CASE_EXTENDED_FIELDS } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  deleteAllCaseItems,
  createCase,
  findInternalCaseUserActions,
} from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';

const FIELD_DEFINITIONS_URL = '/internal/cases/field_definitions';

const buildFieldDef = (name: string) => ({
  name,
  owner: 'securitySolutionFixture',
  isGlobal: true,
  definition: yamlStringify({
    name,
    type: 'keyword',
    control: 'INPUT_TEXT',
    label: name,
  }),
});

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_user_actions — extended_fields search projection', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const createCaseWithTwoFields = async () => {
      await Promise.all([
        supertest
          .post(`${FIELD_DEFINITIONS_URL}`)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('my_field'))
          .expect(200),
        supertest
          .post(`${FIELD_DEFINITIONS_URL}`)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('label'))
          .expect(200),
      ]);

      return createCase(supertest, {
        ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        [CASE_EXTENDED_FIELDS]: {
          my_field_as_keyword: 'initial',
          label_as_keyword: 'option_1',
        },
      });
    };

    it('returns only matching fields when searching a multi-field extended_fields update', async () => {
      const createdCase = await createCaseWithTwoFields();

      const { body: updated } = await supertest
        .patch(`${CASES_URL}`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send({
          cases: [
            {
              id: createdCase.id,
              version: createdCase.version,
              [CASE_EXTENDED_FIELDS]: {
                my_field_as_keyword: 'xyzaua',
                label_as_keyword: 'option_2',
              },
            },
          ],
        })
        .expect(200);

      expect(updated[0][CASE_EXTENDED_FIELDS]).to.eql({
        my_field_as_keyword: 'xyzaua',
        label_as_keyword: 'option_2',
      });

      const response = await findInternalCaseUserActions({
        caseID: createdCase.id,
        supertest,
        options: { search: 'xyzaua' },
      });

      const extendedFieldActions = response.userActions.filter(
        (action) => action.type === 'extended_fields'
      );
      expect(extendedFieldActions.length).to.be.greaterThan(0);

      const projected = extendedFieldActions.find(
        (action) =>
          action.payload.extended_fields != null &&
          Object.prototype.hasOwnProperty.call(
            action.payload.extended_fields,
            'my_field_as_keyword'
          )
      );
      expect(projected).not.to.be(undefined);
      expect(projected!.payload.extended_fields).to.eql({
        my_field_as_keyword: 'xyzaua',
      });
    });

    it('returns the full extended_fields map when search matches the author', async () => {
      const createdCase = await createCaseWithTwoFields();

      await findInternalCaseUserActions({
        caseID: createdCase.id,
        supertest,
        options: { search: 'elastic' },
      }).then((response) => {
        const extendedFieldActions = response.userActions.filter(
          (action) => action.type === 'extended_fields'
        );
        expect(extendedFieldActions.length).to.be.greaterThan(0);

        for (const action of extendedFieldActions) {
          expect(Object.keys(action.payload.extended_fields ?? {}).length).to.be.greaterThan(1);
          expect(action.payload.extended_fields).to.have.property('my_field_as_keyword');
          expect(action.payload.extended_fields).to.have.property('label_as_keyword');
        }
      });
    });

    it('returns every field when search is not provided', async () => {
      const createdCase = await createCaseWithTwoFields();

      const response = await findInternalCaseUserActions({
        caseID: createdCase.id,
        supertest,
      });

      const extendedFieldActions = response.userActions.filter(
        (action) => action.type === 'extended_fields'
      );
      expect(extendedFieldActions.length).to.be.greaterThan(0);

      const createAction = extendedFieldActions[0];
      expect(createAction.payload.extended_fields).to.eql({
        my_field_as_keyword: 'initial',
        label_as_keyword: 'option_1',
      });
    });
  });
};
