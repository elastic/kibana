/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

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

    async navigateToSingleCase(app: string = 'cases', caseId: string, tabId?: string) {
      const search = tabId != null ? `?tabId=${tabId}` : '';
      await common.navigateToUrlWithBrowserHistory(app, caseId, search);
    },
  };
}
