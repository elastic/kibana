/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'header']);

  describe('Role Description', function () {
    before(async () => {
      await security.testUser.setRoles(['cluster_security_manager']);
      await PageObjects.security.initTests();
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
      await security.role.delete('a-role-with-description');
      await security.role.delete('a-role-without-description');
      await security.testUser.restoreDefaults();
    });

    it('Can create role with description', async () => {
      await PageObjects.security.clickCreateNewRole();
      await testSubjects.setValue('roleFormNameInput', 'a-role-with-description');
      await testSubjects.setValue('roleFormDescriptionInput', 'role description');
      await PageObjects.security.clickSaveEditRole();

      const columnDescription = await testSubjects.getVisibleText(
        'roleRowDescription-a-role-with-description'
      );
      expect(columnDescription).to.equal('role description');

      await PageObjects.settings.clickLinkText('a-role-with-description');
      const name = await testSubjects.getAttribute('roleFormNameInput', 'value');
      const description = await testSubjects.getAttribute('roleFormDescriptionInput', 'value');

      expect(name).to.equal('a-role-with-description');
      expect(description).to.equal('role description');

      await PageObjects.security.clickCancelEditRole();
    });

    it('Can create role without description', async () => {
      await PageObjects.security.clickCreateNewRole();
      await testSubjects.setValue('roleFormNameInput', 'a-role-without-description');
      await PageObjects.security.clickSaveEditRole();

      await PageObjects.settings.clickLinkText('a-role-without-description');
      const name = await testSubjects.getAttribute('roleFormNameInput', 'value');
      const description = await testSubjects.getAttribute('roleFormDescriptionInput', 'value');

      expect(name).to.equal('a-role-without-description');
      expect(description).to.equal('');

      await PageObjects.security.clickCancelEditRole();
    });
  });
}
