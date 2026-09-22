/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Flag-agnostic Configure-page coverage.
 *
 * Closure options and connectors render on the Case Settings page regardless of
 * the `xpack.cases.templates.enabled` flag. The legacy in-page custom-fields /
 * templates sections (only rendered when the flag is OFF) are covered in
 * `configure_legacy.ts`, and the new v2 templates / field-library pages (only
 * reachable when the flag is ON) are covered in `configure_templates_v2.ts`.
 */
export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const toasts = getService('toasts');
  const header = getPageObject('header');

  describe('Configure', function () {
    before(async () => {
      await cases.navigation.navigateToConfigurationPage();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    describe('Closure options', function () {
      this.beforeEach(async () => {
        await header.waitUntilLoadingHasFinished();
      });

      it('defaults the closure option correctly', async () => {
        await cases.common.assertClosureOption('close-by-user');
      });

      it('change closure option successfully', async () => {
        await cases.common.selectClosureOption('close-by-pushing');
        const toast = await toasts.getElementByIndex(1);
        expect(await toast.getVisibleText()).to.be('Settings successfully updated');
        await toasts.dismissAll();
        await cases.common.assertClosureOption('close-by-pushing');
      });
    });

    describe('Connectors', function () {
      it('defaults the connector to none correctly', async () => {
        expect(await testSubjects.exists('dropdown-connector-no-connector-label')).to.be(true);
      });

      it('opens and closes the connectors flyout correctly', async () => {
        await common.clickAndValidate('add-new-connector', 'euiFlyoutCloseButton');
        await testSubjects.click('euiFlyoutCloseButton');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);
      });
    });
  });
};
