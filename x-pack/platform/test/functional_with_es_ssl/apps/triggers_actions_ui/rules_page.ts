/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const log = getService('log');
  const browser = getService('browser');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);

  describe('Rules page', function () {
    describe('Page Navigation and Loading', () => {
      before(async () => {
        await pageObjects.common.navigateToApp('rules');
      });

      it('navigates to /app/rules successfully', async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules');
      });

      it('loads with correct page title', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const pageTitle = await testSubjects.getVisibleText('rulesPageTitle');
        expect(pageTitle).to.be('Rules');
      });

      it('displays the rules list', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('rulesList');
      });

      it('loading spinner disappears', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Verify that the page is fully loaded by checking for the rules list
        await testSubjects.existOrFail('rulesList');
      });
    });
  });
};
