/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const cases = getService('cases');
  const testSubjects = getService('testSubjects');
  const deployment = getService('deployment');

  describe('per-solution Cases app', () => {
    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('mounts Cases under Stack Management', async () => {
      await cases.navigation.navigateToApp();
      expect(await browser.getCurrentUrl()).to.contain('/app/management/insightsAndAlerting/cases');
    });

    it('opens a case at its Stack Management URL', async () => {
      const theCase = await cases.api.createCase({ owner: 'cases' });
      await cases.navigation.navigateToSingleCase('cases', theCase.id);
      await testSubjects.existOrFail('case-view-title');
      expect(await browser.getCurrentUrl()).to.contain(
        `/app/management/insightsAndAlerting/cases/${theCase.id}`
      );
    });

    it('does not register a top-level /app/cases app', async () => {
      await browser.get(`${deployment.getHostPort()}/app/cases`);
      await testSubjects.existOrFail('appNotFoundPageContent');
    });
  });
};
