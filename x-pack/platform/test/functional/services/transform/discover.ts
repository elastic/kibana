/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export function TransformDiscoverProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');

  const waitForDiscoverQueryHits = async () => {
    await retry.waitFor('Discover query hits to render', async () => {
      return (
        (await testSubjects.exists('discoverQueryHits', { timeout: 1000 })) ||
        (await testSubjects.exists('discoverQueryHitsPartial', { timeout: 1000 }))
      );
    });

    return (await testSubjects.exists('discoverQueryHits', { timeout: 1000 }))
      ? 'discoverQueryHits'
      : 'discoverQueryHitsPartial';
  };

  return {
    async assertDiscoverQueryHits(expectedDiscoverQueryHits: string) {
      const queryHitsTestSubj = await waitForDiscoverQueryHits();

      const actualDiscoverQueryHits = await testSubjects.getVisibleText(queryHitsTestSubj);

      expect(actualDiscoverQueryHits).to.eql(
        expectedDiscoverQueryHits,
        `Discover query hits should be ${expectedDiscoverQueryHits}, got ${actualDiscoverQueryHits}`
      );
    },

    async assertDiscoverQueryHitsMoreThanZero() {
      const queryHitsTestSubj = await waitForDiscoverQueryHits();

      const actualDiscoverQueryHits = await testSubjects.getVisibleText(queryHitsTestSubj);

      const hits = parseInt(actualDiscoverQueryHits, 10);
      expect(hits).to.greaterThan(0, `Discover query hits should be more than 0, got ${hits}`);
    },

    async assertNoResults(expectedDestinationIndex: string) {
      await testSubjects.missingOrFail('discoverQueryHits');

      // Discover should use the destination index pattern
      const actualIndexPatternSwitchLinkText = await dataViews.getSelectedName();

      expect(actualIndexPatternSwitchLinkText).to.eql(
        expectedDestinationIndex,
        `Destination index should be ${expectedDestinationIndex}, got ${actualIndexPatternSwitchLinkText}`
      );

      await testSubjects.existOrFail('discoverNoResults');
    },
  };
}
