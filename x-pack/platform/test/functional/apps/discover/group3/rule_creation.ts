/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  describe('Discover rule creation', function () {
    const { common } = getPageObjects(['common', 'settings', 'shareSavedObjectsToSpace']);
    const find = getService('find');
    const testSubjects = getService('testSubjects');

    it('navigate to Discover', () => {
      return common.navigateToApp('discover');
    });

    it('begin creating rule', async () => {
      await testSubjects.click('app-menu-overflow-button');
      await find.clickByButtonText('Alerts');
      await find.clickByButtonText('Create search threshold rule');
      await find.clickByButtonText('Details');
    });

    it('should have the "Related dashboards" section', async () => {
      const linkedDashboardsElement = await find.byCssSelector(
        '[data-test-subj="ruleLinkedDashboards"]'
      );
      expect(linkedDashboardsElement).to.be.ok();
      expect(await linkedDashboardsElement.isDisplayed()).to.be(true);
    });
  });
}
