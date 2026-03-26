/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header', 'userProfiles', 'settings', 'security']);

  describe('Cloud Links integration: Unprivileged User', function () {
    before(async () => {
      // Create role mapping so user gets superuser access
      await getService('esSupertest')
        .post('/_security/role_mapping/cloud-saml-kibana')
        .send({
          roles: ['viewer'],
          enabled: true,
          rules: { field: { 'realm.name': 'cloud-saml-kibana' } },
        })
        .expect(200);

      await PageObjects.security.forceLogout({ waitForLoginPage: false });
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToUrl('home');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('"Manage this deployment" is appended to the nav list', async () => {
      await PageObjects.common.clickAndValidate('toggleNavButton', 'collapsibleNavCustomNavLink');
      const cloudLink = await find.byLinkText('Manage this deployment');
      expect(cloudLink).to.not.be(null);
    });

    after(async () => {
      // Clean up role mapping
      await getService('esSupertest')
        .delete('/_security/role_mapping/cloud-saml-kibana')
        .expect(200);
      await browser.refresh();
    });

    describe('Fills up the user menu items', () => {
      it('Shows the button Profile', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'userMenuLink__Profile');
        const cloudLink = await find.byLinkText('Profile');
        expect(cloudLink).to.not.be(null);
      });

      it('Does NOT show the button Billing', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'userMenuLink__Billing');
        const billingLinkExists = await find.existsByLinkText('Billing');
        expect(billingLinkExists).to.be(false);
      });

      it('Shows the button Organization', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'userMenuLink__Organization');
        const cloudLink = await find.byLinkText('Organization');
        expect(cloudLink).to.not.be(null);
      });

      it('Shows the appearance button', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'appearanceSelector');
      });
    });
  });
}
