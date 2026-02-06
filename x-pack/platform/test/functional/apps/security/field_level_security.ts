/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { keyBy } from 'lodash';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'discover', 'header']);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  describe('field_level_security', () => {
    before('initialize tests', async () => {
      await security.testUser.setRoles(['cluster_security_manager', 'kibana_admin']);
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/security/flstest/data'
      ); // ( data)
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/security/flstest/index_pattern'
      );
      await browser.setWindowSize(1600, 1000);
    });

    it('should add new role a_viewssnrole', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('a_viewssnrole', {
        elasticsearch: {
          indices: [
            {
              names: ['flstest'],
              privileges: ['read', 'view_index_metadata'],
              field_security: {
                grant: ['customer_ssn', 'customer_name', 'customer_region', 'customer_type'],
              },
            },
          ],
        },
      });

      await PageObjects.common.sleep(1000);
      const roles = keyBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('a_viewssnrole');
      expect(roles.a_viewssnrole.reserved).to.be(false);
    });

    it('should add new role a_view_no_ssn_role', async function () {
      await PageObjects.security.addRole('a_view_no_ssn_role', {
        elasticsearch: {
          indices: [
            {
              names: ['flstest'],
              privileges: ['read', 'view_index_metadata'],
              field_security: { grant: ['customer_name', 'customer_region', 'customer_type'] },
            },
          ],
        },
      });
      await PageObjects.common.sleep(1000);
      const roles = keyBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      log.debug('actualRoles = %j', roles);
      expect(roles).to.have.key('a_view_no_ssn_role');
      expect(roles.a_view_no_ssn_role.reserved).to.be(false);
    });

    it('should add new user customer1 ', async function () {
      await PageObjects.security.createUser({
        username: 'customer1',
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: 'customer one',
        email: 'flstest@elastic.com',
        roles: ['kibana_admin', 'a_viewssnrole'],
      });
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.customer1.roles).to.eql(['kibana_admin', 'a_viewssnrole']);
    });

    it('should add new user customer2 ', async function () {
      await PageObjects.security.createUser({
        username: 'customer2',
        password: 'changeme',
        confirm_password: 'changeme',
        full_name: 'customer two',
        email: 'flstest@elastic.com',
        roles: ['kibana_admin', 'a_view_no_ssn_role'],
      });
      const users = keyBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      log.debug('actualUsers = %j', users);
      expect(users.customer2.roles).to.eql(['kibana_admin', 'a_view_no_ssn_role']);
    });

    it('user customer1 should see ssn', async function () {
      await PageObjects.security.forceLogout();
      await PageObjects.security.login('customer1', 'changeme');
      await PageObjects.common.navigateToApp('discover');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('2');
      });
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData).to.contain('ssn');
    });

    it('user customer2 should not see ssn', async function () {
      await PageObjects.security.forceLogout();
      await PageObjects.security.login('customer2', 'changeme');
      await PageObjects.common.navigateToApp('discover');
      await retry.tryForTime(10000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('2');
      });
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData).not.to.contain('ssn');
    });

    it('should support case-sensitive fields', async function () {
      await PageObjects.security.forceLogout();
      await PageObjects.security.login();
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('a_casesenstive_fields_role', {
        elasticsearch: {
          indices: [
            {
              names: ['flstest'],
              privileges: ['read', 'view_index_metadata'],
              field_security: {
                grant: ['customer_*', 'Customer_*'],
                except: ['customer_region', 'Customer_region'],
              },
            },
          ],
        },
      });

      await PageObjects.common.sleep(1000);

      const roleDef = await security.role.get('a_casesenstive_fields_role');
      expect(roleDef).to.eql({
        _transform_error: [],
        _unrecognized_applications: [],
        elasticsearch: {
          cluster: [],
          indices: [
            {
              allow_restricted_indices: false,
              field_security: {
                except: ['customer_region', 'Customer_region'],
                grant: ['customer_*', 'Customer_*'],
              },
              names: ['flstest'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
          run_as: [],
        },
        kibana: [
          {
            base: ['all'],
            feature: {},
            spaces: ['*'],
          },
        ],
        metadata: {},
        name: 'a_casesenstive_fields_role',
        transient_metadata: {
          enabled: true,
        },
      });
    });

    after(async function () {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/functional/fixtures/kbn_archives/security/flstest/index_pattern'
      );
      await security.testUser.restoreDefaults();
    });
  });
}
