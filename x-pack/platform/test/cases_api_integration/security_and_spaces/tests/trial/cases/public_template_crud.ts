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
import { deleteAllCaseItems, getSpaceUrlPrefix } from '../../../../common/lib/api';
import type { User } from '../../../../common/lib/authentication/types';
import {
  noKibanaPrivileges,
  obsOnly,
  secOnly,
  secOnlyManageTemplates,
  secOnlyNoManageTemplates,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

const TEMPLATES_URL = `${CASES_URL}/templates`;
const OWNER = 'securitySolutionFixture';

const buildDefinition = (title = 'Case default title') =>
  yamlStringify({
    name: title,
    severity: 'high',
    fields: [
      {
        name: 'priority',
        type: 'keyword',
        control: 'INPUT_TEXT',
        label: 'Priority',
        metadata: { default: 'medium' },
      },
    ],
  });

const buildWriteBody = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  owner: OWNER,
  definition: buildDefinition(),
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

  describe('public template CRUD', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('POST /api/cases/templates', () => {
      it('creates a template and returns the parsed shape', async () => {
        const { body } = await requestAs('post', TEMPLATES_URL)
          .send(buildWriteBody('My Public Template'))
          .expect(200);

        expect(body.templateId).to.be.a('string');
        expect(body.templateVersion).to.eql(1);
        expect(body.name).to.eql('My Public Template');
        expect(body.owner).to.eql(OWNER);
        expect(body.definition.fields).to.have.length(1);
        expect(body.isLatest).to.eql(true);
      });

      it('dry_run validates without creating', async () => {
        const { body } = await requestAs('post', `${TEMPLATES_URL}?dry_run=true`)
          .send(buildWriteBody('Dry Run Template'))
          .expect(200);

        expect(body).to.eql({ valid: true });

        const { body: found } = await requestAs('get', TEMPLATES_URL).expect(200);
        expect(
          found.templates.filter((t: { name: string }) => t.name === 'Dry Run Template')
        ).to.have.length(0);
      });

      it('rejects invalid YAML with 400', async () => {
        const { body } = await requestAs('post', TEMPLATES_URL)
          .send(buildWriteBody('Bad Template', { definition: ': {not valid yaml' }))
          .expect(400);

        expect(body.message).to.contain('Invalid YAML definition');
      });

      it('rejects a schema-invalid definition with 400 and issue details', async () => {
        const { body } = await requestAs('post', TEMPLATES_URL)
          .send(
            buildWriteBody('Bad Template', {
              definition: yamlStringify({ severity: 'not-a-severity', fields: [] }),
            })
          )
          .expect(400);

        expect(body.message).to.contain('Invalid template definition');
      });

      it('rejects server-managed attributes with 400 (strict body)', async () => {
        const { body } = await requestAs('post', TEMPLATES_URL)
          .send(buildWriteBody('Sneaky Template', { usageCount: 9000 }))
          .expect(400);

        expect(body.message).to.contain('Invalid request body');
      });

      it('returns 409 for a duplicate name (case-insensitive)', async () => {
        await requestAs('post', TEMPLATES_URL).send(buildWriteBody('Unique Name')).expect(200);
        await requestAs('post', TEMPLATES_URL).send(buildWriteBody('unique name')).expect(409);
      });

      it('dry_run also surfaces the 409 name conflict', async () => {
        await requestAs('post', TEMPLATES_URL).send(buildWriteBody('Conflict Name')).expect(200);
        await requestAs('post', `${TEMPLATES_URL}?dry_run=true`)
          .send(buildWriteBody('Conflict Name'))
          .expect(409);
      });
    });

    describe('PUT /api/cases/templates/{template_id}', () => {
      it('creates a new version and keeps the previous one retrievable', async () => {
        const { body: created } = await requestAs('post', TEMPLATES_URL)
          .send(buildWriteBody('Versioned Template'))
          .expect(200);

        const { body: updated } = await requestAs('put', `${TEMPLATES_URL}/${created.templateId}`)
          .send(buildWriteBody('Versioned Template', { definition: buildDefinition('New title') }))
          .expect(200);

        expect(updated.templateVersion).to.eql(2);
        expect(updated.isLatest).to.eql(true);

        const { body: oldVersion } = await requestAs(
          'get',
          `${TEMPLATES_URL}/${created.templateId}?version=1`
        ).expect(200);
        expect(oldVersion.templateVersion).to.eql(1);
        expect(oldVersion.definition.name).to.eql('Case default title');
      });

      it('returns 404 for an unknown template', async () => {
        await requestAs('put', `${TEMPLATES_URL}/does-not-exist-000000000000`)
          .send(buildWriteBody('Whatever'))
          .expect(404);
      });

      it('dry_run validates without writing a new version', async () => {
        const { body: created } = await requestAs('post', TEMPLATES_URL)
          .send(buildWriteBody('Stable Template'))
          .expect(200);

        await requestAs('put', `${TEMPLATES_URL}/${created.templateId}?dry_run=true`)
          .send(buildWriteBody('Stable Template Renamed'))
          .expect(200);

        const { body: after } = await requestAs(
          'get',
          `${TEMPLATES_URL}/${created.templateId}`
        ).expect(200);
        expect(after.templateVersion).to.eql(1);
        expect(after.name).to.eql('Stable Template');
      });
    });

    describe('DELETE /api/cases/templates/{template_id}', () => {
      it('soft-deletes the template', async () => {
        const { body: created } = await requestAs('post', TEMPLATES_URL)
          .send(buildWriteBody('Doomed Template'))
          .expect(200);

        await requestAs('delete', `${TEMPLATES_URL}/${created.templateId}`).expect(204);
        await requestAs('get', `${TEMPLATES_URL}/${created.templateId}`).expect(404);
      });

      it('returns 404 for an unknown template', async () => {
        await requestAs('delete', `${TEMPLATES_URL}/does-not-exist-000000000000`).expect(404);
      });
    });

    describe('rbac', () => {
      const writeBodyFor = (name: string) => buildWriteBody(name);

      it('allows a user with the manage templates sub-privilege to create, update, and delete', async () => {
        const auth = { user: secOnlyManageTemplates, space: 'space1' };

        const { body: created } = await requestAs('post', TEMPLATES_URL, auth)
          .send(writeBodyFor('Managed Template'))
          .expect(200);

        await requestAs('put', `${TEMPLATES_URL}/${created.templateId}`, auth)
          .send(writeBodyFor('Managed Template Renamed'))
          .expect(200);

        await requestAs('delete', `${TEMPLATES_URL}/${created.templateId}`, auth).expect(204);
      });

      for (const user of [secOnly, secOnlyRead, secOnlyNoManageTemplates]) {
        it(`returns 403 on create for "${user.username}" (no manage templates privilege)`, async () => {
          await requestAs('post', TEMPLATES_URL, { user, space: 'space1' })
            .send(writeBodyFor(`Denied Template ${user.username}`))
            .expect(403);
        });
      }

      it('returns 403 (not 404) on update/delete for a template reader without manage rights', async () => {
        const manageAuth = { user: secOnlyManageTemplates, space: 'space1' };
        const { body: created } = await requestAs('post', TEMPLATES_URL, manageAuth)
          .send(writeBodyFor('Guarded Template'))
          .expect(200);

        // cases `all` grants template read but not manage — the id is legitimately visible.
        const readerAuth = { user: secOnly, space: 'space1' };
        await requestAs('put', `${TEMPLATES_URL}/${created.templateId}`, readerAuth)
          .send(writeBodyFor('Guarded Template Renamed'))
          .expect(403);
        await requestAs('delete', `${TEMPLATES_URL}/${created.templateId}`, readerAuth).expect(403);
      });

      it('returns 404 (not 403) on update/delete probes from a user with no cases access', async () => {
        const manageAuth = { user: secOnlyManageTemplates, space: 'space1' };
        const { body: created } = await requestAs('post', TEMPLATES_URL, manageAuth)
          .send(writeBodyFor('Hidden Template'))
          .expect(200);

        for (const user of [noKibanaPrivileges, obsOnly]) {
          await requestAs('put', `${TEMPLATES_URL}/${created.templateId}`, {
            user,
            space: 'space1',
          })
            .send(writeBodyFor('Hidden Template Probe'))
            .expect(404);
          await requestAs('delete', `${TEMPLATES_URL}/${created.templateId}`, {
            user,
            space: 'space1',
          }).expect(404);
        }
      });

      it('owner scoping: a securitySolution manage-templates user cannot create an observability template', async () => {
        await requestAs('post', TEMPLATES_URL, { user: secOnlyManageTemplates, space: 'space1' })
          .send(buildWriteBody('Wrong Owner Template', { owner: 'observabilityFixture' }))
          .expect(403);
      });

      it('spaces: a template created in space2 is not visible or mutable from space1', async () => {
        const { body: created } = await requestAs('post', TEMPLATES_URL, {
          user: superUser,
          space: 'space2',
        })
          .send(buildWriteBody('Space2 Template'))
          .expect(200);

        await requestAs('get', `${TEMPLATES_URL}/${created.templateId}`, {
          user: superUser,
          space: 'space1',
        }).expect(404);
        await requestAs('delete', `${TEMPLATES_URL}/${created.templateId}`, {
          user: superUser,
          space: 'space1',
        }).expect(404);
      });
    });
  });
};
