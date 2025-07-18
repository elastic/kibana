/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function statusPageFunctonalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['security', 'statusPage', 'common']);

  describe('Status Page', function () {
    this.tags(['skipCloud', 'includeFirefox']);
    before(async () => await kibanaServer.savedObjects.cleanStandardList());
    after(async () => await kibanaServer.savedObjects.cleanStandardList());

    it('allows user to navigate without authentication', async () => {
      await PageObjects.security.forceLogout();
      await PageObjects.common.navigateToApp('status_page', { shouldLoginIfPrompted: false });
      await PageObjects.statusPage.expectStatusPage();
    });
  });
}
