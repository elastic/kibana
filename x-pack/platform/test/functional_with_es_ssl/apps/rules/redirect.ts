/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';
import { getTestAlertData } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const security = getService('security');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const browser = getService('browser');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Redirect from /app/rules to Stack Management rules page', () => {
    before(async () => {
      await security.testUser.setRoles(['alerts_and_actions_role']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await objectRemover.removeAll();
    });

    it('redirects /app/rules to the Stack Management rules page', async () => {
      await pageObjects.common.navigateToApp('rules_redirect', {
        skipUrlValidation: true,
      });
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('app/management/insightsAndAlerting/triggersActions');
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('preserves the sub-path when redirecting /app/rules/:path to Stack Management', async () => {
      const { body: createdRule } = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            rule_type_id: 'test.always-firing',
          })
        )
        .expect(200);
      objectRemover.add(createdRule.id, 'rule', 'alerting');

      await pageObjects.common.navigateToApp('rules_redirect', {
        path: `rule/${createdRule.id}`,
        skipUrlValidation: true,
      });
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(
          `app/management/insightsAndAlerting/triggersActions/rule/${createdRule.id}`
        );
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    });
  });
};
