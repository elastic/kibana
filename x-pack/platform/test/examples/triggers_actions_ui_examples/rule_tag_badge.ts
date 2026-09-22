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

  describe('Rule tag badge', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await PageObjects.common.navigateToApp('triggersActionsUiExample/rule_tag_badge');
    });
    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
    });

    it('should load from the shareable lazy loader', async () => {
      await testSubjects.find('ruleTagBadge');
      const exists = await testSubjects.waitForExists('ruleTagBadge');
      expect(exists).to.be(true);
    });

    it('should open and display tags', async () => {
      await testSubjects.click('ruleTagBadge');
      await testSubjects.existOrFail('ruleTagBadgeItem-tag1');
      await testSubjects.existOrFail('ruleTagBadgeItem-tag2');
      await testSubjects.existOrFail('ruleTagBadgeItem-tag3');
      await testSubjects.existOrFail('ruleTagBadgeItem-tag4');
    });
  });
};
