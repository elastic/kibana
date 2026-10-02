/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Role } from '@kbn/security-plugin/common';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const PageObjects = getPageObjects(['security', 'settings', 'header']);

  const roleName = 'data-source-privs-crud-role';
  const updatedRoleDescription = 'updated role description';

  const expectedDataSourcePrivileges = [
    {
      names: ['acme_*'],
      privileges: ['read'],
    },
  ];

  describe('Roles CRUD with data source privileges', function () {
    this.tags(['skipFirefox']);

    const tryDeleteRole = async () => {
      try {
        await security.role.delete(roleName);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes(' 404 ') ||
          message.includes('404 Not Found') ||
          message.includes('"statusCode":404')
        ) {
          return;
        }
        throw error;
      }
    };

    before(async () => {
      await security.testUser.setRoles(['cluster_security_manager']);
      await PageObjects.security.initTests();

      await tryDeleteRole();

      await security.role.create(roleName, {
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
          global: {
            data_source: expectedDataSourcePrivileges,
          },
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      });
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
      await tryDeleteRole();
      await security.testUser.restoreDefaults();
    });

    it('can read the role from the roles listing', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();

      await retry.waitFor('role appears in roles table', async () => {
        const roles = await PageObjects.security.getElasticsearchRoles();
        return roles.some((r) => r.rolename === roleName);
      });
    });

    it('can update a role and preserves its data source privileges', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.settings.clickLinkText(roleName);

      const loadedName = await testSubjects.getAttribute('roleFormNameInput', 'value');
      expect(loadedName).to.equal(roleName);

      await testSubjects.setValue('roleFormDescriptionInput', updatedRoleDescription);
      await PageObjects.security.clickSaveEditRole();

      const columnDescription = await testSubjects.getVisibleText(`roleRowDescription-${roleName}`);
      expect(columnDescription).to.equal(updatedRoleDescription);

      const updatedRole = await security.role.get(roleName);
      expect((updatedRole as Role).elasticsearch.global?.data_source).to.eql(
        expectedDataSourcePrivileges
      );
    });

    it('can delete a role with data source privileges', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();

      await testSubjects.click(`checkboxSelectRow-${roleName}`);
      await testSubjects.click('deleteRoleButton');
      await testSubjects.click('confirmModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitFor('role no longer appears in roles table', async () => {
        const roles = await PageObjects.security.getElasticsearchRoles();
        return !roles.some((r) => r.rolename === roleName);
      });
    });
  });
}
