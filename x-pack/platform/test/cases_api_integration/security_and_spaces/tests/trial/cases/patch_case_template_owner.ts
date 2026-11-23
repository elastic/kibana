/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify as yamlStringify } from 'yaml';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  getCase,
  updateCase,
  getSpaceUrlPrefix,
} from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { obsOnly, superUser } from '../../../../common/lib/authentication/users';

const SEC_OWNER = 'securitySolutionFixture';
const OBS_OWNER = 'observabilityFixture';
const SPACE = 'space1';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  const createTemplate = async (owner: string, name: string) => {
    const { body } = await supertest
      .post(`${getSpaceUrlPrefix(SPACE)}/internal/cases/templates`)
      .set('kbn-xsrf', 'true')
      .send({
        name,
        owner,
        definition: yamlStringify({
          name,
          fields: [
            {
              control: 'INPUT_TEXT',
              name: 'secret_storage_key',
              label: 'Customer ACME Corp Contract',
              type: 'keyword',
            },
          ],
        }),
        isEnabled: true,
      })
      .expect(200);
    return body as { templateId: string; templateVersion: number };
  };

  const patchTemplate = (theCase: Case, template: { id: string; version: number }) => ({
    cases: [{ id: theCase.id, version: theCase.version, template }],
  });

  describe('patch case: template owner validation', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it("rejects attaching another owner's template to a case", async () => {
      const secTemplate = await createTemplate(SEC_OWNER, 'Sec only secret template');
      const obsCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: OBS_OWNER }),
        200,
        { user: obsOnly, space: SPACE }
      );

      await updateCase({
        supertest: supertestWithoutAuth,
        params: patchTemplate(obsCase, {
          id: secTemplate.templateId,
          version: secTemplate.templateVersion,
        }),
        expectedHttpCode: 400,
        auth: { user: obsOnly, space: SPACE },
      });

      const after = await getCase({
        supertest: supertestWithoutAuth,
        caseId: obsCase.id,
        auth: { user: obsOnly, space: SPACE },
      });
      expect(after.template == null).to.be(true);
    });

    it('rejects an empty template id, which would otherwise match a template of any owner', async () => {
      const secTemplate = await createTemplate(SEC_OWNER, 'Sec only secret template');
      const obsCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: OBS_OWNER }),
        200,
        { user: obsOnly, space: SPACE }
      );

      await updateCase({
        supertest: supertestWithoutAuth,
        params: patchTemplate(obsCase, { id: '', version: secTemplate.templateVersion }),
        expectedHttpCode: 400,
        auth: { user: obsOnly, space: SPACE },
      });

      const after = await getCase({
        supertest: supertestWithoutAuth,
        caseId: obsCase.id,
        auth: { user: obsOnly, space: SPACE },
      });
      expect(after.template == null).to.be(true);
    });

    it('still allows attaching a template of the same owner', async () => {
      const obsTemplate = await createTemplate(OBS_OWNER, 'Obs template');
      const obsCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: OBS_OWNER }),
        200,
        { user: obsOnly, space: SPACE }
      );

      const [updated] = await updateCase({
        supertest: supertestWithoutAuth,
        params: patchTemplate(obsCase, {
          id: obsTemplate.templateId,
          version: obsTemplate.templateVersion,
        }),
        auth: { user: obsOnly, space: SPACE },
      });

      expect(updated.template?.id).to.eql(obsTemplate.templateId);
    });

    it('allows a super user to clear the template', async () => {
      const obsTemplate = await createTemplate(OBS_OWNER, 'Obs template');
      const obsCase = await createCase(
        supertestWithoutAuth,
        { ...getPostCaseRequest({ owner: OBS_OWNER }), template: { id: obsTemplate.templateId } },
        200,
        { user: superUser, space: SPACE }
      );

      const [updated] = await updateCase({
        supertest: supertestWithoutAuth,
        params: { cases: [{ id: obsCase.id, version: obsCase.version, template: null }] },
        auth: { user: superUser, space: SPACE },
      });

      expect(updated.template == null).to.be(true);
    });
  });
};
