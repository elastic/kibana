/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MlNodesPanelProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertNodesOverviewPanelExists(expectPanelExits: boolean = true) {
      if (expectPanelExits) {
        await testSubjects.existOrFail('mlNodesOverviewPanel');
      } else {
        await testSubjects.missingOrFail('mlNodesOverviewPanel');
      }
    },

    async assertNodesListLoaded() {
      await testSubjects.existOrFail('mlNodesTable loaded', { timeout: 5000 });
    },

    async assertMlNodesCount(minCount: number = 1) {
      await retry.try(async () => {
        const actualCount = parseInt(await testSubjects.getVisibleText('mlTotalNodesCount'), 10);
        expect(actualCount).to.not.be.lessThan(
          minCount,
          `Total ML nodes count should be at least '${minCount}' (got '${actualCount}')`
        );
      });
    },

    async assertNodeOverviewPanel() {
      await this.assertNodesOverviewPanelExists();
      await this.assertNodesListLoaded();
      await this.assertMlNodesCount();
    },
  };
}
