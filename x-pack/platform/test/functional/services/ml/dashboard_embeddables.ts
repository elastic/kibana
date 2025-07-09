/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlDashboardJobSelectionTable } from './dashboard_job_selection_table';

export function MachineLearningDashboardEmbeddablesProvider(
  { getService }: FtrProviderContext,
  mlDashboardJobSelectionTable: MlDashboardJobSelectionTable
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');

  return {
    async assertAnomalyChartsEmbeddableInitializerExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.existOrFail('mlAnomalyChartsEmbeddableInitializer', { timeout: 1000 });
      });
    },

    async assertSingleMetricViewerEmbeddableInitializerNotExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('mlSingleMetricViewerEmbeddableInitializer', {
          timeout: 1000,
        });
      });
    },

    async assertAnomalyChartsEmbeddableInitializerNotExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('mlAnomalyChartsEmbeddableInitializer', { timeout: 1000 });
      });
    },

    async assertSelectMaxSeriesToPlotValue(expectedValue: number) {
      const subj = 'mlAnomalyChartsInitializerMaxSeries';
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        const input = await testSubjects.find(subj);
        const actualValue = await input.getAttribute('value');

        expect(actualValue).to.eql(
          expectedValue,
          `Expected max series to plot value to be ${expectedValue}, got ${actualValue}`
        );
      });
    },

    async assertInitializerConfirmButtonEnabled(subj: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        await testSubjects.isEnabled(subj);
      });
    },

    async clickInitializerConfirmButtonEnabled() {
      const subj = 'mlAnomalyChartsInitializerConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertInitializerConfirmButtonEnabled(subj);
        await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
        await this.assertAnomalyChartsEmbeddableInitializerNotExists();
      });
    },

    async clickSingleMetricViewerInitializerConfirmButtonEnabled() {
      const subj = 'mlSingleMetricViewerInitializerConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertInitializerConfirmButtonEnabled(subj);
        await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
        await this.assertSingleMetricViewerEmbeddableInitializerNotExists();
      });
    },

    async assertDashboardIsEmpty() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('emptyDashboardWidget');
      });
    },

    async assertDashboardPanelExists(title: string) {
      await retry.tryForTime(5000, async () => {
        await find.existsByLinkText(title);
      });
    },

    async assertAnomalyChartsSeverityThresholdControlExists() {
      await retry.tryForTime(3 * 60 * 1000, async () => {
        await testSubjects.existOrFail(`mlAnomalySeverityThresholdControls`);
      });
    },

    async assertNoMatchingAnomaliesMessageExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`mlNoMatchingAnomaliesMessage`);
      });
    },

    async assertAnomalyChartsExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`mlExplorerChartsContainer`);
      });
    },

    async assertAnomalySwimlaneExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`mlAnomalySwimlaneEmbeddableWrapper`);
      });
    },

    async assertMlSectionExists(expectExist = true) {
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('ml', expectExist);
      });
    },

    async openAnomalyJobSelectionFlyout(
      mlEmbeddableType: 'ml_anomaly_swimlane' | 'ml_anomaly_charts' | 'ml_single_metric_viewer'
    ) {
      const name = {
        ml_anomaly_swimlane: 'Anomaly swim lane',
        ml_single_metric_viewer: 'Single metric viewer',
        ml_anomaly_charts: 'Anomaly chart',
      };
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await testSubjects.existOrFail('dashboardPanelSelectionFlyout', { timeout: 2000 });

        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('ml');

        await dashboardAddPanel.clickAddNewPanelFromUIActionLink(name[mlEmbeddableType]);
        await testSubjects.existOrFail('mlAnomalyJobSelectionControls', { timeout: 2000 });
      });
    },
  };
}
