/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export function TransformDiscoverProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const { discover } = getPageObjects(['discover']);

  const waitForDiscoverQueryHits = async () => {
    await discover.waitUntilTabIsLoaded();
    return await discover.getHitCount();
  };

  return {
    async assertDiscoverQueryHits(expectedDiscoverQueryHits: string) {
      const actualDiscoverQueryHits = await waitForDiscoverQueryHits();

      expect(actualDiscoverQueryHits).to.eql(
        expectedDiscoverQueryHits,
        `Discover query hits should be ${expectedDiscoverQueryHits}, got ${actualDiscoverQueryHits}`
      );
    },

    async assertDiscoverQueryHitsMoreThanZero() {
      const actualDiscoverQueryHits = await waitForDiscoverQueryHits();

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
