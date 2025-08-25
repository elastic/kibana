/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const securityService = getService('security');
  const { common, error, maps, security } = getPageObjects(['common', 'error', 'maps', 'security']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');

  // more tests are in x-pack/test/functional/apps/saved_query_management/feature_controls/security.ts

  describe('maps security feature controls', () => {
    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await security.forceLogout();
    });

    describe('global maps all privileges', () => {
      before(async () => {
        await securityService.role.create('global_maps_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                maps: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('global_maps_all_user', {
          password: 'global_maps_all_user-password',
          roles: ['global_maps_all_role'],
          full_name: 'test user',
        });

        await security.forceLogout();

        await security.login('global_maps_all_user', 'global_maps_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();
        await Promise.all([
          securityService.role.delete('global_maps_all_role'),
          securityService.user.delete('global_maps_all_user'),
        ]);
      });

      it('shows maps navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Maps');
      });

      it(`allows a map to be created`, async () => {
        await maps.openNewMap();
        await maps.expectExistAddLayerButton();
        await maps.saveMap('my test map');
      });

      it(`allows a map to be deleted`, async () => {
        await maps.deleteSavedMaps('my test map');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it('allows saving via the saved query management component popover with no saved query loaded', async () => {
        await maps.openNewMap();
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.saveNewQuery('foo', 'bar', true, false);
        await savedQueryManagementComponent.savedQueryExistOrFail('foo');
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();

        await savedQueryManagementComponent.deleteSavedQuery('foo');
        await savedQueryManagementComponent.savedQueryMissingOrFail('foo');
      });

      it('allow saving changes to a currently loaded query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
          'new description',
          true,
          false
        );
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:404');

        // Reset after changing
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
          'Ok responses for jpg files',
          true,
          false
        );
      });
    });

    describe('global maps read-only privileges', () => {
      before(async () => {
        await securityService.role.create('global_maps_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                maps: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('global_maps_read_user', {
          password: 'global_maps_read_user-password',
          roles: ['global_maps_read_role'],
          full_name: 'test user',
        });

        await security.login('global_maps_read_user', 'global_maps_read_user-password', {
          expectSpaceSelector: false,
        });

        await maps.gotoMapListingPage();
      });

      after(async () => {
        await securityService.role.delete('global_maps_read_role');
        await securityService.user.delete('global_maps_read_user');
      });

      it('shows Maps navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Maps']);
      });

      it(`does not show create new button`, async () => {
        await maps.expectMissingCreateNewButton();
      });

      it(`does not allow a map to be deleted`, async () => {
        await testSubjects.missingOrFail('checkboxSelectAll');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      describe('existing map', () => {
        before(async () => {
          await maps.loadSavedMap('document example');
        });

        it(`can't save`, async () => {
          await maps.expectMissingSaveButton();
        });

        it(`can't add layer`, async () => {
          await maps.expectMissingAddLayerButton();
        });

        it('allows loading a saved query via the saved query management component', async () => {
          await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
          const queryString = await queryBar.getQueryString();
          expect(queryString).to.eql('response:200');
        });

        it('does not allow saving via the saved query management component popover with no query loaded', async () => {
          await savedQueryManagementComponent.saveNewQueryMissingOrFail();
        });

        it('does not allow saving changes to saved query from the saved query management component', async () => {
          await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
          await queryBar.setQuery('response:404');
          await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
        });

        it('does not allow deleting a saved query from the saved query management component', async () => {
          await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
        });

        it('allows clearing the currently loaded saved query', async () => {
          await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
          await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        });
      });
    });

    describe('no maps privileges', () => {
      before(async () => {
        await securityService.role.create('no_maps_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('no_maps_privileges_user', {
          password: 'no_maps_privileges_user-password',
          roles: ['no_maps_privileges_role'],
          full_name: 'test user',
        });

        await security.login('no_maps_privileges_user', 'no_maps_privileges_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await securityService.role.delete('no_maps_privileges_role');
        await securityService.user.delete('no_maps_privileges_user');
      });

      it('does not show Maps navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.not.contain('Maps');
      });

      it(`returns a 403`, async () => {
        await common.navigateToActualUrl('maps', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await error.expectForbidden();
      });
    });
  });
}
