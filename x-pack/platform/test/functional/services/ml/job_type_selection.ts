/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobTypeSelectionProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  return {
    // The data recognizer section renders above the cards and shifts them down when it resolves.
    async assertJobTypeSelectionReady() {
      await find.byCssSelector(
        '[data-test-subj="mlPageJobTypeSelection"][data-recognizer-status="complete"]',
        30 * 1000
      );
    },

    async selectSingleMetricJob() {
      await this.assertJobTypeSelectionReady();
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkSingleMetricJob');
      await this.assertSingleMetricJobWizardOpen();
    },

    async assertSingleMetricJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard single_metric');
    },

    async selectMultiMetricJob() {
      await this.assertJobTypeSelectionReady();
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkMultiMetricJob');
      await this.assertMultiMetricJobWizardOpen();
    },

    async assertMultiMetricJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard multi_metric');
    },

    async selectPopulationJob() {
      await this.assertJobTypeSelectionReady();
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkPopulationJob');
      await this.assertPopulationJobWizardOpen();
    },

    async selectGeoJob() {
      await this.assertJobTypeSelectionReady();
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkGeoJob');
      await this.assertGeoJobWizardOpen();
    },

    async assertPopulationJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard population');
    },

    async assertGeoJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard geo');
    },

    async selectAdvancedJob() {
      await this.assertJobTypeSelectionReady();
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkAdvancedJob');
      await this.assertAdvancedJobWizardOpen();
    },

    async assertAdvancedJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard advanced');
    },

    async selectCategorizationJob() {
      await this.assertJobTypeSelectionReady();
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkCategorizationJob');
      await this.assertCategorizationJobWizardOpen();
    },

    async assertCategorizationJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard categorization');
    },

    async selectRecognizerJob(moduleId: string) {
      await this.assertJobTypeSelectionReady();
      await testSubjects.clickWhenNotDisabledWithoutRetry(`mlRecognizerCard ${moduleId}`);
      await this.assertRecognizerJobWizardOpen();
    },

    async assertRecognizerJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard recognizer');
    },
  };
}
