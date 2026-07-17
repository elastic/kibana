/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { EXTENDED_TIMEOUT } from '../constants';

export class DiagnosticsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/diagnostics`);
    await this.page
      .getByTestId('apmDiagnosticsTemplateRefreshButton')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async gotoImportExport() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/diagnostics/import-export`);
  }

  getBadge(testSubj: string) {
    return this.page.getByTestId(testSubj);
  }

  async clickTab(testSubj: string) {
    await this.page.getByTestId(testSubj).click();
  }

  async importBundle(filePath: string) {
    await this.gotoImportExport();
    await this.page
      .locator('#file-picker')
      .waitFor({ state: 'attached', timeout: EXTENDED_TIMEOUT });
    await this.page.locator('#file-picker').setInputFiles(filePath);
    // Reading and parsing the file happens asynchronously (FileReader), so wait for the
    // UI to confirm the bundle was imported before interacting with the page any further.
    await this.removeReportButton.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  public get removeReportButton() {
    return this.page.getByTestId('apmImportCardRemoveReportButton');
  }

  async clearBundle() {
    // The EuiCallOut wrapping this button uses `announceOnMount`, which renders a second copy
    // of its children (including this button) into a `role="status"` live region for screen
    // readers. That copy is clipped off-screen rather than hidden, so Playwright's `visible`
    // check still matches it. Exclude anything nested under the live region instead.
    await this.page
      .locator('[data-test-subj="apmTemplateDescriptionClearBundleButton"]:not([role="status"] *)')
      .click();
    await this.removeReportButton.waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
  }

  async expectTableRendered(containerTestSubj?: string) {
    const root = containerTestSubj
      ? this.page.getByTestId(containerTestSubj)
      : this.page.getByTestId('apmDiagnosticsTemplate');
    await expect(root.locator('.euiTable')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  }
}
