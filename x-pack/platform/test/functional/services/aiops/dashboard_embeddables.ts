/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

type AiopsEmbeddableType = 'aiopsLogRateAnalysisEmbeddable' | 'aiopsChangePointChart';

export function AiopsDashboardEmbeddablesProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');

  return {
    async assertLogRateAnalysisEmbeddableInitializerExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.existOrFail('aiopsLogRateAnalysisEmbeddableInitializer', {
          timeout: 1000,
        });
      });
    },

    async assertLogRateAnalysisEmbeddableInitializerNotExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('aiopsLogRateAnalysisEmbeddableInitializer', {
          timeout: 1000,
        });
      });
    },

    async assertChangePointChartInitializerExists(expectExists = true) {
      await retry.tryForTime(10 * 1000, async () => {
        if (expectExists) {
          await testSubjects.existOrFail('aiopsChangePointChartEmbeddableInitializer', {
            timeout: 1000,
          });
        } else {
          await testSubjects.missingOrFail('aiopsChangePointChartEmbeddableInitializer', {
            timeout: 1000,
          });
        }
      });
    },

    async assertInitializerConfirmButtonEnabled(subj: string, expectEnabled = true) {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        const isEnabled = await testSubjects.isEnabled(subj);
        if (expectEnabled) {
          expect(isEnabled).to.be(true);
        } else {
          expect(isEnabled).to.be(false);
        }
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

    async assertLogsAiopsSectionExists(expectExist = true) {
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('logs-aiops', expectExist);
      });
    },

    async clickLogRateAnalysisInitializerConfirmButtonEnabled() {
      const subj = 'aiopsLogRateAnalysisConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertInitializerConfirmButtonEnabled(subj);
        await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
        await this.assertLogRateAnalysisEmbeddableInitializerNotExists();
      });
    },

    async submitChangePointInitForm() {
      const subj = 'aiopsChangePointChartsInitializerConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
        await this.assertChangePointChartInitializerExists(false);
      });
    },

    async openEmbeddableInitializer(mlEmbeddableType: AiopsEmbeddableType) {
      const name = {
        aiopsLogRateAnalysisEmbeddable: 'Log rate analysis',
        aiopsChangePointChart: 'Change point detection',
      };
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await testSubjects.existOrFail('dashboardPanelSelectionFlyout', { timeout: 2000 });

        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('logs-aiops');

        await dashboardAddPanel.clickAddNewPanelFromUIActionLink(name[mlEmbeddableType]);
        await this.assertEmbeddableControlsExist(mlEmbeddableType);
      });
    },

    async assertEmbeddableControlsExist(mlEmbeddableType: AiopsEmbeddableType) {
      const controlSelectors = {
        aiopsLogRateAnalysisEmbeddable: 'aiopsLogRateAnalysisControls',
        aiopsChangePointChart: 'aiopsChangePointDetectionControls',
      };
      await testSubjects.existOrFail(controlSelectors[mlEmbeddableType], { timeout: 2000 });
    },

    async assertChangePointPanelExists() {
      await testSubjects.existOrFail('aiopsEmbeddableChangePointChart');
    },

    async assertLogRateAnalysisEmbeddableDataViewSelectorExists() {
      await testSubjects.existOrFail(
        'aiopsLogRateAnalysisEmbeddableDataViewSelector > comboBoxInput'
      );
    },

    async assertChangePointChartEmbeddableDataViewSelectorExists() {
      await testSubjects.existOrFail(
        'aiopsChangePointChartEmbeddableDataViewSelector > comboBoxInput'
      );
    },

    async assertLogRateAnalysisEmbeddableDataViewSelection(dataViewValue: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'aiopsLogRateAnalysisEmbeddableDataViewSelector > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        [dataViewValue],
        `Expected data view selection  to be '${dataViewValue}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async assertChangePointChartEmbeddableDataViewSelection(dataViewValue: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'aiopsChangePointChartEmbeddableDataViewSelector > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        [dataViewValue],
        `Expected data view selection  to be '${dataViewValue}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectLogRateAnalysisEmbeddableDataView(dataViewValue: string) {
      await comboBox.set(
        'aiopsLogRateAnalysisEmbeddableDataViewSelector > comboBoxInput',
        dataViewValue
      );
      await this.assertLogRateAnalysisEmbeddableDataViewSelection(dataViewValue);
    },

    async selectChangePointChartEmbeddableDataView(dataViewValue: string) {
      await comboBox.set(
        'aiopsChangePointChartEmbeddableDataViewSelector > comboBoxInput',
        dataViewValue
      );
      await this.assertChangePointChartEmbeddableDataViewSelection(dataViewValue);
    },
  };
}
