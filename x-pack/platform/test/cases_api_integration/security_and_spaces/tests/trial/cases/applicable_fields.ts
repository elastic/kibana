/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify as yamlStringify } from 'yaml';
import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { deleteAllCaseItems, createCase, getSpaceUrlPrefix } from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import type { User } from '../../../../common/lib/authentication/types';
import {
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  secOnly,
  secOnlyManageTemplates,
  secOnlyNoManageTemplates,
  secOnlyRead,
  secOnlySpacesAll,
  superUser,
} from '../../../../common/lib/authentication/users';

const FIELD_DEFINITIONS_URL = '/internal/cases/field_definitions';
const APPLICABLE_FIELDS_URL = `${CASES_URL}/fields`;
const OWNER = 'securitySolutionFixture';

const buildFieldDef = (name: string, type = 'keyword', isGlobal = true) => ({
  name,
  owner: OWNER,
  isGlobal,
  definition: yamlStringify({ name, type, control: 'INPUT_TEXT', label: name }),
});

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  const getPublic = (path: string) =>
    supertest
      .get(path)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'foo')
      .set('elastic-api-version', '2023-10-31');

  const getPublicAs = (path: string, auth: { user: User; space: string }) =>
    supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(auth.space)}${path}`)
      .auth(auth.user.username, auth.user.password)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'foo')
      .set('elastic-api-version', '2023-10-31');

  const createTemplate = async (fields: Array<Record<string, unknown>>, owner: string = OWNER) => {
    const { body } = await supertest
      .post('/internal/cases/templates')
      .set('kbn-xsrf', 'true')
      .send({
        name: 'Test Template',
        owner,
        definition: yamlStringify({ name: 'Test Template', fields }),
        isEnabled: true,
      })
      .expect(200);
    return body;
  };

  describe('applicable fields — public discovery API', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('GET /api/cases/fields (pre-create discovery)', () => {
      it('returns the owner global fields when no template is provided', async () => {
        await supertest
          .post(FIELD_DEFINITIONS_URL)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('risk_score'))
          .expect(200);

        const { body } = await getPublic(`${APPLICABLE_FIELDS_URL}?owner=${OWNER}`).expect(200);

        const riskScore = body.fields.find(
          (f: { key: string }) => f.key === 'risk_score_as_keyword'
        );
        expect(riskScore).to.be.ok();
        expect(riskScore.source).to.eql('global');
        expect(riskScore.isGlobal).to.eql(true);
        expect(riskScore.displayOnly).to.eql(false);
      });

      it('returns global + template fields and flags MARKDOWN as displayOnly when a template is provided', async () => {
        await supertest
          .post(FIELD_DEFINITIONS_URL)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('global_tag'))
          .expect(200);

        const template = await createTemplate([
          { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', label: 'Summary' },
          { name: 'instructions', control: 'MARKDOWN', metadata: { content: '# Read me' } },
        ]);

        const { body } = await getPublic(
          `${APPLICABLE_FIELDS_URL}?owner=${OWNER}&templateId=${template.templateId}`
        ).expect(200);

        const keys = body.fields.map((f: { key: string }) => f.key);
        expect(keys).to.contain('global_tag_as_keyword');
        expect(keys).to.contain('summary_as_keyword');

        const markdown = body.fields.find(
          (f: { key: string }) => f.key === 'instructions_as_keyword'
        );
        expect(markdown.displayOnly).to.eql(true);
        expect(markdown.source).to.eql('template');
      });

      it('returns 400 for an unknown template', async () => {
        await getPublic(`${APPLICABLE_FIELDS_URL}?owner=${OWNER}&templateId=does-not-exist`).expect(
          400
        );
      });

      it('returns 400 (and does not leak fields) when templateId belongs to a different owner', async () => {
        const otherOwnerTemplate = await createTemplate(
          [{ name: 'secret_field', type: 'keyword', control: 'INPUT_TEXT', label: 'Secret' }],
          'observabilityFixture'
        );

        const { body } = await getPublic(
          `${APPLICABLE_FIELDS_URL}?owner=${OWNER}&templateId=${otherOwnerTemplate.templateId}`
        ).expect(400);

        expect(JSON.stringify(body)).to.not.contain('secret_field');
      });

      it('returns 400 when owner is omitted', async () => {
        await getPublic(APPLICABLE_FIELDS_URL).expect(400);
      });
    });

    describe('GET /api/cases/{case_id}/fields (existing-case discovery)', () => {
      it('reflects the template applied to the case', async () => {
        await supertest
          .post(FIELD_DEFINITIONS_URL)
          .set('kbn-xsrf', 'true')
          .send(buildFieldDef('global_tag'))
          .expect(200);

        const template = await createTemplate([
          { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', label: 'Summary' },
        ]);

        const createdCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId, version: template.templateVersion },
        });

        const { body } = await getPublic(`${CASES_URL}/${createdCase.id}/fields`).expect(200);

        const keys = body.fields.map((f: { key: string }) => f.key);
        expect(keys).to.contain('global_tag_as_keyword');
        expect(keys).to.contain('summary_as_keyword');
      });

      it('returns 404 for a missing case', async () => {
        await getPublic(`${CASES_URL}/does-not-exist/fields`).expect(404);
      });

      it('accepts connector-generated 64-char SHA-256 case ids (404, not a 400 length rejection)', async () => {
        const sha256Id = 'a'.repeat(64);
        await getPublic(`${CASES_URL}/${sha256Id}/fields`).expect(404);
      });
    });

    describe('rbac', () => {
      describe('GET /api/cases/fields (pre-create discovery)', () => {
        beforeEach(async () => {
          await supertest
            .post(`${getSpaceUrlPrefix('space1')}${FIELD_DEFINITIONS_URL}`)
            .set('kbn-xsrf', 'true')
            .send(buildFieldDef('risk_score'))
            .expect(200);
        });

        for (const user of [
          secOnly,
          secOnlyRead,
          secOnlyManageTemplates,
          secOnlyNoManageTemplates,
        ]) {
          it(`allows "${user.username}" to discover the owner's applicable fields`, async () => {
            const { body } = await getPublicAs(`${APPLICABLE_FIELDS_URL}?owner=${OWNER}`, {
              user,
              space: 'space1',
            }).expect(200);

            const keys = body.fields.map((f: { key: string }) => f.key);
            expect(keys).to.contain('risk_score_as_keyword');
          });
        }

        it('returns 403 for a user with no Kibana privileges', async () => {
          await getPublicAs(`${APPLICABLE_FIELDS_URL}?owner=${OWNER}`, {
            user: noKibanaPrivileges,
            space: 'space1',
          }).expect(403);
        });

        it('is space-isolated: field definitions from space1 are not visible in space2', async () => {
          // `secOnlySpacesAll` has securitySolutionFixture privileges in every space, so the
          // request itself is authorized in space2 and the assertion isolates the DATA scoping
          // (a space1-only user would 403 here before space isolation is ever exercised).
          const { body } = await getPublicAs(`${APPLICABLE_FIELDS_URL}?owner=${OWNER}`, {
            user: secOnlySpacesAll,
            space: 'space2',
          }).expect(200);

          const keys = body.fields.map((f: { key: string }) => f.key);
          expect(keys).to.not.contain('risk_score_as_keyword');
        });
      });

      describe('GET /api/cases/{case_id}/fields (existing-case discovery)', () => {
        for (const user of [secOnly, secOnlyRead]) {
          it(`allows "${user.username}" to discover a case's applicable fields`, async () => {
            const createdCase = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: OWNER }),
              200,
              { user: secOnly, space: 'space1' }
            );

            const { body } = await getPublicAs(`${CASES_URL}/${createdCase.id}/fields`, {
              user,
              space: 'space1',
            }).expect(200);

            expect(body.fields).to.be.an('array');
          });
        }

        it('returns 403 when the user does not have access to the case owner', async () => {
          const createdCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: OWNER }),
            200,
            { user: secOnly, space: 'space1' }
          );

          for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
            await getPublicAs(`${CASES_URL}/${createdCase.id}/fields`, {
              user,
              space: 'space1',
            }).expect(403);
          }
        });

        it('returns 403 when querying from a space the user has no access to', async () => {
          const createdCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: OWNER }),
            200,
            { user: superUser, space: 'space2' }
          );

          await getPublicAs(`${CASES_URL}/${createdCase.id}/fields`, {
            user: secOnly,
            space: 'space2',
          }).expect(403);
        });
      });
    });
  });
};
