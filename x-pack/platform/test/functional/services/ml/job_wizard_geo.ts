/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { MlCommonUI } from './common_ui';

export function MachineLearningJobWizardGeoProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertGeoFieldInputExists() {
      await testSubjects.existOrFail('mlGeoFieldNameSelect > comboBoxInput');
    },

    async assertGeoFieldSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlGeoFieldNameSelect > comboBoxInput',
        expectedIdentifier,
        'geo field selection'
      );
    },

    async selectGeoField(identifier: string) {
      await retry.tryForTime(5 * 1000, async () => {
        await mlCommonUI.setOptionsListWithFieldStatsValue(
          'mlGeoFieldNameSelect > comboBoxInput',
          identifier
        );
        await this.assertGeoFieldSelection([identifier]);
      });
    },

    async assertSplitCardWithMapExampleExists() {
      await testSubjects.existOrFail('mlGeoJobWizardMap');
    },

    async assertDetectorPreviewExists(detectorDescription: string) {
      await testSubjects.existOrFail('mlGeoMap > mlDetectorTitle');
      const actualDetectorTitle = await testSubjects.getVisibleText('mlGeoMap > mlDetectorTitle');
      await retry.tryForTime(5 * 1000, async () => {
        expect(actualDetectorTitle).to.eql(
          detectorDescription,
          `Expected detector title to be '${detectorDescription}' (got '${actualDetectorTitle}')`
        );

        await testSubjects.existOrFail('mlGeoJobWizardMap');
        await testSubjects.existOrFail('mapContainer');
      });
    },
  };
}
