/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('Breadcrumbs', () => {
    before(async () => {
      await security.testUser.setRoles(['global_devtools_read']);
      await PageObjects.common.navigateToApp('searchProfiler');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Sets the right breadcrumbs when navigating to console app', async () => {
      await PageObjects.common.navigateToApp('dev_tools');

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(lastBreadcrumbdcrumb).to.be('Console');
    });

    it('Sets the right breadcrumbs when navigating to grok debugger app', async () => {
      await PageObjects.common.navigateToApp('grokDebugger');

      const lastBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(lastBreadcrumb).to.be('Grok Debugger');
    });

    it('Sets the right breadcrumbs when navigating to search profiler app', async () => {
      await PageObjects.common.navigateToApp('searchProfiler');

      const lastBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(lastBreadcrumb).to.be('Search Profiler');
    });

    it('Sets the right breadcrumbs when navigating to painless lab app', async () => {
      await PageObjects.common.navigateToApp('painlessLab');

      const lastBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(lastBreadcrumb).to.be('Painless Lab');
    });
  });
}
