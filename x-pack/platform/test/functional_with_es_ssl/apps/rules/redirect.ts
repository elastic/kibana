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

  describe('Redirect from triggersActions to rules app', () => {
    before(async () => {
      await security.testUser.setRoles(['alerts_and_actions_role']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await objectRemover.removeAll();
    });

    it('redirects to rules app home when navigating to triggersActions with path rules', async () => {
      await pageObjects.common.navigateToApp('triggersActions', {
        skipUrlValidation: true,
      });
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('app/rules');
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('redirects to rule details page when navigating to triggersActions with path rule/:id', async () => {
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

      await pageObjects.common.navigateToApp('triggersActions', {
        path: createdRule.id,
        skipUrlValidation: true,
      });
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`app/rules/${createdRule.id}`);
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('redirects to edit rule page when navigating to triggersActions with path edit/:id', async () => {
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

      await pageObjects.common.navigateToApp('triggersActions', {
        path: `edit/${createdRule.id}`,
        skipUrlValidation: true,
      });
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`app/rules/edit/${createdRule.id}`);
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('redirects to create rule page when navigating to triggersActions with path create/:ruleTypeId', async () => {
      await pageObjects.common.navigateToApp('triggersActions', {
        path: 'create/observability.rules.custom_threshold',
        skipUrlValidation: true,
      });
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('app/rules/create/observability.rules.custom_threshold');
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    });
  });
};
