/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { deleteAllCaseItems, getSpaceUrlPrefix } from '../../../../common/lib/api';
import type { User } from '../../../../common/lib/authentication/types';
import {
  obsOnly,
  secOnly,
  secOnlyManageTemplates,
  secOnlyNoManageTemplates,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

const FIELD_DEFINITIONS_URL = `${CASES_URL}/field_definitions`;
const OWNER = 'securitySolutionFixture';

const buildDefinitionYaml = (name = 'priority') =>
  `name: ${name}\nlabel: Priority\ntype: keyword\ncontrol: INPUT_TEXT\n`;

const buildWriteBody = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  owner: OWNER,
  definition: buildDefinitionYaml(name),
  ...overrides,
});

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  const requestAs = (
    method: 'post' | 'put' | 'delete' | 'get',
    path: string,
    auth?: { user: User; space: string }
  ) => {
    const agent = auth ? supertestWithoutAuth : supertest;
    const req = agent[method](`${auth ? getSpaceUrlPrefix(auth.space) : ''}${path}`)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'foo');
    return auth ? req.auth(auth.user.username, auth.user.password) : req;
  };

  describe('public field-definition CRUD', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('POST /api/cases/field_definitions', () => {
      it('creates a field definition and returns the public shape', async () => {
        const { body } = await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('priority'))
          .expect(200);

        expect(body.fieldDefinitionId).to.be.a('string');
        expect(body.name).to.eql('priority');
        expect(body.owner).to.eql(OWNER);
        expect(body.definition).to.contain('name: priority');
        expect(body).not.to.have.property('legacyKey');
      });

      it('rejects server-managed attributes with 400 (strict body)', async () => {
        const { body } = await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('priority', { displayOrder: 99 }))
          .expect(400);

        expect(body.message).to.contain('Invalid request body');
      });

      it('returns 409 for a duplicate name (case-insensitive)', async () => {
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('priority')).expect(200);
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('PRIORITY')).expect(409);
      });

      it('returns 400 when the body name does not match the YAML name', async () => {
        const { body } = await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('priority', { definition: buildDefinitionYaml('severity') }))
          .expect(400);

        expect(body.message).to.contain('name');
      });
    });

    describe('GET /api/cases/field_definitions', () => {
      it('returns an empty paginated list when no definitions exist', async () => {
        const { body } = await requestAs('get', `${FIELD_DEFINITIONS_URL}?owner=${OWNER}`).expect(
          200
        );

        expect(body.fieldDefinitions).to.have.length(0);
        expect(body.total).to.eql(0);
        expect(body.page).to.eql(1);
        expect(body.perPage).to.eql(20);
      });

      it('returns created definitions with pagination fields', async () => {
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('priority')).expect(200);
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('severity')).expect(200);

        const { body } = await requestAs('get', `${FIELD_DEFINITIONS_URL}?owner=${OWNER}`).expect(
          200
        );

        expect(body.fieldDefinitions).to.have.length(2);
        expect(body.total).to.eql(2);
        expect(body.page).to.eql(1);
      });

      it('omits legacyKey from list results', async () => {
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('priority')).expect(200);
        const { body } = await requestAs('get', `${FIELD_DEFINITIONS_URL}?owner=${OWNER}`).expect(
          200
        );

        for (const fd of body.fieldDefinitions) {
          expect(fd).not.to.have.property('legacyKey');
        }
      });

      it('filters by search term', async () => {
        await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('priority', { description: 'ticket priority' }))
          .expect(200);
        await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('severity', { description: 'incident severity' }))
          .expect(200);

        const { body } = await requestAs(
          'get',
          `${FIELD_DEFINITIONS_URL}?owner=${OWNER}&search=prio`
        ).expect(200);

        expect(body.fieldDefinitions).to.have.length(1);
        expect(body.fieldDefinitions[0].name).to.eql('priority');
      });

      it('paginates correctly with page/perPage', async () => {
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('field_a')).expect(200);
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('field_b')).expect(200);
        await requestAs('post', FIELD_DEFINITIONS_URL).send(buildWriteBody('field_c')).expect(200);

        const { body } = await requestAs(
          'get',
          `${FIELD_DEFINITIONS_URL}?owner=${OWNER}&page=1&perPage=2`
        ).expect(200);

        expect(body.fieldDefinitions).to.have.length(2);
        expect(body.total).to.eql(3);
        expect(body.page).to.eql(1);
        expect(body.perPage).to.eql(2);
      });

      it('returns 400 when owner is missing', async () => {
        await requestAs('get', FIELD_DEFINITIONS_URL).expect(400);
      });
    });

    describe('PUT /api/cases/field_definitions/{field_definition_id}', () => {
      it('updates the description and returns the updated shape', async () => {
        const { body: created } = await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('priority'))
          .expect(200);

        const { body: updated } = await requestAs(
          'put',
          `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`
        )
          .send(buildWriteBody('priority', { description: 'Updated description' }))
          .expect(200);

        expect(updated.description).to.eql('Updated description');
        expect(updated).not.to.have.property('legacyKey');
      });

      it('returns 409 with typed attributes when the name changes (identity-immutable)', async () => {
        const { body: created } = await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('priority'))
          .expect(200);

        const { body } = await requestAs(
          'put',
          `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`
        )
          .send(buildWriteBody('severity', { definition: buildDefinitionYaml('severity') }))
          .expect(409);

        expect(body.attributes).to.have.property('code', 'field_identity_immutable');
        expect(body.attributes.changed).to.contain('name');
      });

      it('returns 404 for an unknown field definition', async () => {
        await requestAs('put', `${FIELD_DEFINITIONS_URL}/00000000-0000-0000-0000-000000000000`)
          .send(buildWriteBody('priority'))
          .expect(404);
      });
    });

    describe('DELETE /api/cases/field_definitions/{field_definition_id}', () => {
      it('deletes the field definition', async () => {
        const { body: created } = await requestAs('post', FIELD_DEFINITIONS_URL)
          .send(buildWriteBody('priority'))
          .expect(200);

        await requestAs('delete', `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`).expect(
          204
        );

        const { body } = await requestAs('get', `${FIELD_DEFINITIONS_URL}?owner=${OWNER}`).expect(
          200
        );
        expect(body.fieldDefinitions).to.have.length(0);
      });

      it('returns 404 for an unknown field definition', async () => {
        await requestAs(
          'delete',
          `${FIELD_DEFINITIONS_URL}/00000000-0000-0000-0000-000000000000`
        ).expect(404);
      });
    });

    describe('rbac', () => {
      it('allows a user with manage templates privilege to create, update, and delete', async () => {
        const auth = { user: secOnlyManageTemplates, space: 'space1' };

        const { body: created } = await requestAs('post', FIELD_DEFINITIONS_URL, auth)
          .send(buildWriteBody('priority'))
          .expect(200);

        await requestAs('put', `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`, auth)
          .send(buildWriteBody('priority', { description: 'Updated' }))
          .expect(200);

        await requestAs(
          'delete',
          `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`,
          auth
        ).expect(204);
      });

      it('allows a user with full cases access to create a field definition', async () => {
        await requestAs('post', FIELD_DEFINITIONS_URL, { user: secOnly, space: 'space1' })
          .send(buildWriteBody('priority'))
          .expect(200);
      });

      it('list GET requires only cases read access', async () => {
        await requestAs('get', `${FIELD_DEFINITIONS_URL}?owner=${OWNER}`, {
          user: secOnlyRead,
          space: 'space1',
        }).expect(200);
      });

      for (const user of [secOnlyRead, secOnlyNoManageTemplates]) {
        it(`returns 403 on create for "${user.username}" (no manage templates privilege)`, async () => {
          await requestAs('post', FIELD_DEFINITIONS_URL, { user, space: 'space1' })
            .send(buildWriteBody(`denied_${user.username}`))
            .expect(403);
        });
      }

      it('returns 404 (not 403) on update/delete for a user with no access to the template owner', async () => {
        const manageAuth = { user: secOnlyManageTemplates, space: 'space1' };
        const { body: created } = await requestAs('post', FIELD_DEFINITIONS_URL, manageAuth)
          .send(buildWriteBody('priority'))
          .expect(200);

        // obsOnly manages observability, not securitySolutionFixture — must hide existence (404)
        await requestAs('put', `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`, {
          user: obsOnly,
          space: 'space1',
        })
          .send(buildWriteBody('priority'))
          .expect(404);

        await requestAs('delete', `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`, {
          user: obsOnly,
          space: 'space1',
        }).expect(404);
      });

      it('owner scoping: a securitySolution user cannot create an observability field definition', async () => {
        await requestAs('post', FIELD_DEFINITIONS_URL, {
          user: secOnlyManageTemplates,
          space: 'space1',
        })
          .send(buildWriteBody('priority', { owner: 'observabilityFixture' }))
          .expect(403);
      });

      it('spaces: a definition created in space2 is not visible or mutable from space1', async () => {
        const { body: created } = await requestAs('post', FIELD_DEFINITIONS_URL, {
          user: superUser,
          space: 'space2',
        })
          .send(buildWriteBody('priority'))
          .expect(200);

        const { body: listBody } = await requestAs(
          'get',
          `${FIELD_DEFINITIONS_URL}?owner=${OWNER}`,
          { user: superUser, space: 'space1' }
        ).expect(200);
        expect(
          listBody.fieldDefinitions.map((fd: { fieldDefinitionId: string }) => fd.fieldDefinitionId)
        ).not.to.contain(created.fieldDefinitionId);

        await requestAs('delete', `${FIELD_DEFINITIONS_URL}/${created.fieldDefinitionId}`, {
          user: superUser,
          space: 'space1',
        }).expect(404);
      });
    });
  });
};
