/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import { CASES_URL, CASE_EXTENDED_FIELDS } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  deleteAllCaseItems,
  createCase,
  createConfiguration,
  getConfigurationRequest,
} from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';

/**
 * Covers the structured error contracts of the customFields <-> extended_fields
 * bidirectional pairing/mirroring introduced for the field library (#282772):
 * `field_representations_conflict` (dual explicit input disagrees) and
 * `field_linkage_malformed` (the v1 -> v2 link itself is broken). Both codes
 * are asserted in `common/constants/error_codes.ts` but, prior to this file,
 * had no API-level coverage.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('bidirectional field pairing — customFields <-> extended_fields', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('field_representations_conflict (400)', () => {
      it('rejects a create supplying conflicting values for both representations of a linked field', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'priority_key',
                  label: 'priority',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
            },
          })
        );

        const { body } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'foo')
          .send({
            ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            customFields: [
              { key: 'priority_key', type: CustomFieldTypes.TEXT, value: 'from customFields' },
            ],
            [CASE_EXTENDED_FIELDS]: { priority_as_keyword: 'from extended_fields' },
          })
          .expect(400);

        expect(body.attributes).to.eql({
          code: 'field_representations_conflict',
          fields: ['priority'],
        });
      });

      it('rejects a PATCH supplying conflicting values for both representations of a linked field', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'priority_key',
                  label: 'priority',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
            },
          })
        );

        const createdCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          customFields: [{ key: 'priority_key', type: CustomFieldTypes.TEXT, value: 'initial' }],
        });

        const { body } = await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'foo')
          .send({
            cases: [
              {
                id: createdCase.id,
                version: createdCase.version,
                customFields: [
                  { key: 'priority_key', type: CustomFieldTypes.TEXT, value: 'from customFields' },
                ],
                [CASE_EXTENDED_FIELDS]: { priority_as_keyword: 'from extended_fields' },
              },
            ],
          })
          .expect(400);

        expect(body.attributes).to.eql({
          code: 'field_representations_conflict',
          fields: ['priority'],
        });
      });

      it('allows a create when both representations of a linked field agree', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'priority_key',
                  label: 'priority',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
            },
          })
        );

        const createdCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          customFields: [{ key: 'priority_key', type: CustomFieldTypes.TEXT, value: 'agreed' }],
          [CASE_EXTENDED_FIELDS]: { priority_as_keyword: 'agreed' },
        });

        expect(createdCase[CASE_EXTENDED_FIELDS]).to.eql({ priority_as_keyword: 'agreed' });
        expect(createdCase.customFields).to.eql([
          { key: 'priority_key', type: CustomFieldTypes.TEXT, value: 'agreed' },
        ]);
      });
    });

    describe('field_linkage_malformed (400)', () => {
      it('rejects a create touching a legacy key claimed by two field definitions (duplicate_legacy_key)', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'dup_key',
                  label: 'Dup Field',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
            },
          })
        );

        // The configure write above auto-links dup_key to one definition. Seed a SECOND
        // definition directly (bypassing the API, which would reject the duplicate) that also
        // claims the same legacyKey, simulating a duplicate produced out-of-band — e.g. a
        // restored/imported copy from before stripLegacyKeyForExport existed.
        await kibanaServer.savedObjects.create({
          type: 'cases-field-definition',
          overwrite: true,
          attributes: {
            fieldDefinitionId: 'dup-field-def-2',
            name: 'dup_field_2',
            owner: 'securitySolutionFixture',
            definition: 'name: dup_field_2\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Dup 2\n',
            isGlobal: true,
            legacyKey: 'dup_key',
          },
        });

        const { body } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'foo')
          .send({
            ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            customFields: [{ key: 'dup_key', type: CustomFieldTypes.TEXT, value: 'value' }],
          })
          .expect(400);

        expect(body.attributes).to.eql({
          code: 'field_linkage_malformed',
          fields: [{ key: 'dup_key', reason: 'duplicate_legacy_key' }],
        });
      });
    });

    describe('bidirectional mirroring round-trip', () => {
      it('mirrors customFields into extended_fields on create, and extended_fields updates flow back to customFields on patch', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                { key: 'sync_key', label: 'sync', type: CustomFieldTypes.TEXT, required: false },
              ],
            },
          })
        );

        const createdCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          customFields: [{ key: 'sync_key', type: CustomFieldTypes.TEXT, value: 'v1 value' }],
        });

        expect(createdCase[CASE_EXTENDED_FIELDS]).to.eql({ sync_as_keyword: 'v1 value' });

        const { body: updated } = await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'foo')
          .send({
            cases: [
              {
                id: createdCase.id,
                version: createdCase.version,
                [CASE_EXTENDED_FIELDS]: { sync_as_keyword: 'v2 value' },
              },
            ],
          })
          .expect(200);

        expect(updated[0].customFields).to.eql([
          { key: 'sync_key', type: CustomFieldTypes.TEXT, value: 'v2 value' },
        ]);
      });
    });
  });
};
