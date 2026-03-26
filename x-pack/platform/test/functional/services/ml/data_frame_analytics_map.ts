/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsMapProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    async assertMapElementsExists() {
      await testSubjects.existOrFail('mlPageDataFrameAnalyticsMap');
      await testSubjects.existOrFail('mlPageDataFrameAnalyticsMapLegend');
      await testSubjects.existOrFail('mlPageDataFrameAnalyticsMapCytoscape');
    },
    async assertJobMapTitle(id: string) {
      const expected = 'Analytics map';
      const titleElement = await find.byCssSelector('.euiPageHeader .euiTitle');
      const actualTitle = await titleElement.getVisibleText();
      expect(actualTitle).to.eql(
        expected,
        `Title for map should be '${expected}' (got '${actualTitle}')`
      );
    },
    async openMlAnalyticsIdSelectionBadge(id: string) {
      await testSubjects.click(`mlAnalyticsIdSelectionBadge-${id}`);
    },
    async assertAnalyticsJobDetailsFlyoutButtonExists(id: string) {
      await testSubjects.existOrFail(`mlAnalyticsJobDetailsFlyoutButton-${id}`);
    },
    async openAnalyticsJobDetailsFlyout(id: string) {
      await testSubjects.click(`mlAnalyticsJobDetailsFlyoutButton-${id}`);
    },
  };
}
