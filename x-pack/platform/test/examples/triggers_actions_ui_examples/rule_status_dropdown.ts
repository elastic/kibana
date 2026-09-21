/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '@kbn/test-suites-src/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const esArchiver = getService('esArchiver');

  describe('Rule status dropdown', function () {
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await PageObjects.common.navigateToApp('triggersActionsUiExample/rule_status_dropdown');
    });
    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
    });

    it('should load from the shareable lazy loader', async () => {
      await testSubjects.find('statusDropdown');
      const exists = await testSubjects.exists('statusDropdown');
      expect(exists).to.be(true);
    });

    it('should store the previous snooze interval', async () => {
      await testSubjects.find('statusDropdown');
      await testSubjects.click('statusDropdown');
      await testSubjects.click('statusDropdownSnoozeItem');
      // Wait for the context menu to finish sliding to the snooze panel (panel-0
      // items removed) so the typed value isn't dropped mid-transition.
      await testSubjects.missingOrFail('statusDropdownEnabledItem');
      await testSubjects.setValue('ruleSnoozeIntervalValue', '10');
      await testSubjects.setValue('ruleSnoozeIntervalUnit', 'h');
      await testSubjects.click('ruleSnoozeApply');

      // Wait for the popover to close after applying before reopening it.
      await testSubjects.missingOrFail('snoozePanel');

      await testSubjects.click('statusDropdown');
      await testSubjects.click('statusDropdownSnoozeItem');
      await testSubjects.missingOrFail('statusDropdownEnabledItem');
      await testSubjects.setValue('ruleSnoozeIntervalValue', '3');
      await testSubjects.existOrFail('ruleSnoozePreviousText');
      expect(await testSubjects.getVisibleText('ruleSnoozePreviousText')).to.be('10 hours');
    });
  });
};
