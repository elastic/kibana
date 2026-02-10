/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  createRuleTemplateSO,
  deleteRuleTemplateByESQuery,
  getRuleTemplate,
  getRuleTemplateResponse,
} from '../../../../common/lib/rule_template';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  Superuser,
  GlobalRead,
  GlobalReadAtSpace1,
  NoKibanaPrivilegesAtSpace1,
  Space1AllAtSpace1,
} from '../../../scenarios';

export default (ftrProvider: FtrProviderContext): void => {
  const supertest = ftrProvider.getService('supertest');

  const supertestWithoutAuth = ftrProvider.getService('supertestWithoutAuth');

  describe('get_rule_template', () => {
    afterEach(async () => {
      await deleteRuleTemplateByESQuery(ftrProvider);
    });

    it('should return a rule template', async () => {
      await createRuleTemplateSO(ftrProvider);

      const ruleTemplate = await getRuleTemplate({
        supertest: supertestWithoutAuth,
        templateId: 'sample-alerting-rule',
      });

      expect(ruleTemplate.body).to.eql({
        ...getRuleTemplateResponse('sample-alerting-rule'),

        description: 'This is a sample alerting rule template description',
        artifacts: {
          dashboards: [{ id: 'dash-1' }],
          investigation_guide: { blob: 'text' },
        },
      });
    });

    it('unhappy path - 404s when rule template do not exists', async () => {
      await supertest
        .get(`/internal/alerting/rule_template/fake-id`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });

    describe('rbac', () => {
      it('should get a rule template when user has access', async () => {
        await createRuleTemplateSO(ftrProvider, { space: 'space1' });

        for (const user of [
          Superuser,
          GlobalRead,
          GlobalReadAtSpace1.user,
          Space1AllAtSpace1.user,
        ]) {
          const ruleTemplate = await getRuleTemplate({
            supertest: supertestWithoutAuth,
            templateId: 'sample-alerting-rule',
            auth: { user, space: 'space1' },
          });
          expect(ruleTemplate.status).to.eql(200);
        }
      });

      it('should not get a rule template when no user has access', async () => {
        await createRuleTemplateSO(ftrProvider, { space: 'space1' });

        for (const user of [NoKibanaPrivilegesAtSpace1.user]) {
          const ruleTemplate = await getRuleTemplate({
            supertest: supertestWithoutAuth,
            templateId: 'sample-alerting-rule',
            auth: { user, space: 'space1' },
          });

          expect(ruleTemplate.status).to.eql(403);
        }
      });

      it('should NOT get a rule template in a space with no permissions', async () => {
        await createRuleTemplateSO(ftrProvider, { space: 'space2' });

        for (const user of [Space1AllAtSpace1.user]) {
          const ruleTemplate = await getRuleTemplate({
            supertest: supertestWithoutAuth,
            templateId: 'sample-alerting-rule',
            auth: { user, space: 'space2' },
          });

          expect(ruleTemplate.status).to.eql(403);
        }
      });
    });
  });
};
