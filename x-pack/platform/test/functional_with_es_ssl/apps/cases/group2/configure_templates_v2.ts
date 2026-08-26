/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * v2 templates / field-library pages.
 *
 * These dedicated pages (`configure/templates`, `configure/field_library`)
 * replace the legacy in-page custom-fields / templates sections and are only
 * reachable when `xpack.cases.templates.enabled` is ON. This suite runs under
 * `group2/config.ts` (flag pinned ON) and asserts the pages are wired,
 * reachable, and render their primary surface.
 *
 * The legacy flag-OFF sections are covered by `configure_legacy.ts`.
 */
export default ({ getPageObject, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const header = getPageObject('header');

  describe('Configure - templates v2 pages', function () {
    after(async () => {
      await cases.api.deleteAllCases();
    });

    describe('Templates list page', function () {
      before(async () => {
        await cases.navigation.navigateToTemplatesPage();
        await header.waitUntilLoadingHasFinished();
      });

      it('renders the templates list page with the empty prompt when there are no templates', async () => {
        // The empty prompt with a "create template" affordance is the primary
        // surface when no templates exist — this proves the flag-ON route is
        // wired and the page renders.
        await testSubjects.existOrFail('templates-table-empty-prompt-no-templates');
        await testSubjects.existOrFail('templates-table-add-template');
      });

      it('exposes the templates table', async () => {
        await testSubjects.existOrFail('templates-table');
      });
    });

    describe('Field library page', function () {
      before(async () => {
        await cases.navigation.navigateToFieldLibraryPage();
        await header.waitUntilLoadingHasFinished();
      });

      it('renders the field library page with its create affordance', async () => {
        await testSubjects.existOrFail('fieldDefinitionsTable');
        await testSubjects.existOrFail('createFieldDefinitionButton');
      });
    });
  });
};
