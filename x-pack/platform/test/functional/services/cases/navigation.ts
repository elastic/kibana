/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function CasesNavigationProvider({ getPageObject, getService }: FtrProviderContext) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');

  return {
    async navigateToApp(app: string = 'cases', appSelector: string = 'cases-app', search?: string) {
      await common.navigateToApp(app, { search });
      await testSubjects.existOrFail(appSelector);
    },

    async navigateToConfigurationPage(app: string = 'cases') {
      await this.navigateToApp(app, 'cases-app');
      await common.clickAndValidate('configure-case-button', 'case-configure-title');
    },

    /**
     * Navigates to the v2 templates list page (`configure/templates`).
     * Only reachable when `xpack.cases.templates.enabled` is ON.
     */
    async navigateToTemplatesPage(app: string = 'cases') {
      // The cases app pathname already ends with a trailing slash, so the
      // sub-path is passed without a leading slash to avoid a double slash.
      await common.navigateToUrlWithBrowserHistory(app, 'configure/templates');
      await testSubjects.existOrFail('cases-app');
    },

    /**
     * Navigates to the v2 field library page (`configure/field_library`).
     * Only reachable when `xpack.cases.templates.enabled` is ON.
     */
    async navigateToFieldLibraryPage(app: string = 'cases') {
      await common.navigateToUrlWithBrowserHistory(app, 'configure/field_library');
      await testSubjects.existOrFail('cases-app');
    },

    async navigateToSingleCase(app: string = 'cases', caseId: string, tabId?: string) {
      const search = tabId != null ? `?tabId=${tabId}` : '';
      await common.navigateToUrlWithBrowserHistory(app, caseId, search);
    },
  };
}
