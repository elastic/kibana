/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify as yamlStringify } from 'yaml';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { deleteAllCaseItems, createCase, getSpaceUrlPrefix } from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { secOnly, secOnlySpacesAll, superUser } from '../../../../common/lib/authentication/users';

const OWNER = 'securitySolutionFixture';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  const createTemplate = async (
    definition: Record<string, unknown>,
    { owner = OWNER, space }: { owner?: string; space?: string } = {}
  ) => {
    const { body } = await supertest
      .post(`${space ? getSpaceUrlPrefix(space) : ''}/internal/cases/templates`)
      .set('kbn-xsrf', 'true')
      .send({
        name: (definition.name as string) ?? 'Expansion Template',
        owner,
        definition: yamlStringify(definition),
        isEnabled: true,
      })
      .expect(200);
    return body;
  };

  const deleteTemplate = async (templateId: string, { space }: { space?: string } = {}) => {
    await supertest
      .post(`${space ? getSpaceUrlPrefix(space) : ''}/internal/cases/templates/_bulk_delete`)
      .set('kbn-xsrf', 'true')
      .send({ ids: [templateId] })
      .expect(204);
  };

  const disableTemplate = async (templateId: string, { space }: { space?: string } = {}) => {
    await supertest
      .patch(`${space ? getSpaceUrlPrefix(space) : ''}/internal/cases/templates/${templateId}`)
      .set('kbn-xsrf', 'true')
      .send({ isEnabled: false })
      .expect(200);
  };

  const kitchenSinkDefinition = {
    name: 'Expansion Template',
    severity: 'high',
    category: 'events',
    tags: ['template-tag'],
    fields: [
      {
        name: 'priority',
        type: 'keyword',
        control: 'INPUT_TEXT',
        label: 'Priority',
        metadata: { default: 'medium' },
      },
      { name: 'effort', type: 'integer', control: 'INPUT_NUMBER', label: 'Effort' },
      { name: 'instructions', control: 'MARKDOWN', metadata: { content: '# Read me' } },
    ],
  };

  describe('create case from template (server-side expansion)', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('applies template defaults and pins the latest version when version is omitted', async () => {
      const template = await createTemplate(kitchenSinkDefinition);

      // Expansion is caller-wins: template severity/tags only apply when the request omits them.
      // getPostCaseRequest pins severity: LOW and tags: ['defacement'], so strip severity and send
      // empty tags to exercise the defaults path (matching the unit test's minimalRequest).
      const { severity, ...baseRequest } = getPostCaseRequest({ owner: OWNER });

      const createdCase = await createCase(supertest, {
        ...baseRequest,
        tags: [],
        template: { id: template.templateId },
      });

      expect(createdCase.template).to.eql({
        id: template.templateId,
        version: template.templateVersion,
      });
      expect(createdCase.severity).to.eql(CaseSeverity.HIGH);
      expect(createdCase.category).to.eql('events');
      expect(createdCase.tags).to.contain('template-tag');
      expect(createdCase.extended_fields).to.eql({
        priority_as_keyword: 'medium',
        effort_as_integer: '',
      });
    });

    it('caller-sent values win over template defaults', async () => {
      const template = await createTemplate(kitchenSinkDefinition);

      const createdCase = await createCase(supertest, {
        ...getPostCaseRequest({ owner: OWNER, tags: ['caller-tag'] }),
        template: { id: template.templateId, version: template.templateVersion },
        severity: CaseSeverity.CRITICAL,
        category: 'incident',
        extended_fields: { priority_as_keyword: 'urgent' },
      });

      expect(createdCase.severity).to.eql(CaseSeverity.CRITICAL);
      expect(createdCase.category).to.eql('incident');
      // Caller-sent tags win outright: the template's 'template-tag' is not merged in.
      expect(createdCase.tags).to.eql(['caller-tag']);
      expect(createdCase.extended_fields).to.eql({
        priority_as_keyword: 'urgent',
        effort_as_integer: '',
      });
    });

    it('rejects an unknown template with 400', async () => {
      await createCase(
        supertest,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: 'does-not-exist' },
        },
        400
      );
    });

    it('rejects a cross-owner template with the same not-found error (no existence leak)', async () => {
      const otherOwnerTemplate = await createTemplate(
        { ...kitchenSinkDefinition, name: 'Obs Template' },
        { owner: 'observabilityFixture' }
      );

      const res = await createCase(
        supertest,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: otherOwnerTemplate.templateId },
        },
        400
      );

      expect(JSON.stringify(res)).to.contain('not found');
    });

    it('rejects a soft-deleted (archived) template with the same not-found error', async () => {
      // Creating a NEW case from a template resolves with includeDeleted: false, so an archived
      // template is no longer selectable. (Cases that already pinned this template keep working —
      // required_on_close validation reads archived versions with includeDeleted: true.)
      const template = await createTemplate(kitchenSinkDefinition);
      await deleteTemplate(template.templateId);

      const res = await createCase(
        supertest,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId },
        },
        400
      );

      expect(JSON.stringify(res)).to.contain('not found');
    });

    it('rejects a disabled template with the same not-found error', async () => {
      // A disabled template is not selectable for new cases (the create-from-template UI requests
      // isEnabled: true only). The API enforces the same, returning the not-found error rather than
      // leaking that the template exists but is disabled.
      const template = await createTemplate(kitchenSinkDefinition);
      await disableTemplate(template.templateId);

      const res = await createCase(
        supertest,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId },
        },
        400
      );

      expect(JSON.stringify(res)).to.contain('not found');
    });

    it('rejects a merged map that violates the template validation (unknown key)', async () => {
      const template = await createTemplate(kitchenSinkDefinition);

      await createCase(
        supertest,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId },
          extended_fields: { not_a_field_as_keyword: 'x' },
        },
        400
      );
    });

    it('allows a user with only case-create privileges (no manageTemplates) to create from a template', async () => {
      const template = await createTemplate(kitchenSinkDefinition, { space: 'space1' });

      const createdCase = await createCase(
        supertestWithoutAuth,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId },
        },
        200,
        { user: secOnly, space: 'space1' }
      );

      expect(createdCase.template?.id).to.eql(template.templateId);
      expect(createdCase.extended_fields?.priority_as_keyword).to.eql('medium');
    });

    it('is space-isolated: a template created in space1 is not resolvable from space2', async () => {
      const template = await createTemplate(kitchenSinkDefinition, { space: 'space1' });

      await createCase(
        supertestWithoutAuth,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId },
        },
        400,
        { user: secOnlySpacesAll, space: 'space2' }
      );
    });

    it('superuser create in another space resolves that space`s template', async () => {
      const template = await createTemplate(kitchenSinkDefinition, { space: 'space2' });

      const createdCase = await createCase(
        supertestWithoutAuth,
        {
          ...getPostCaseRequest({ owner: OWNER }),
          template: { id: template.templateId },
        },
        200,
        { user: superUser, space: 'space2' }
      );

      expect(createdCase.template?.id).to.eql(template.templateId);
    });
  });
};
