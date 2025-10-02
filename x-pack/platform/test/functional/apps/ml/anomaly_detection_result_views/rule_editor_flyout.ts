/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import type { FtrProviderContext } from '../../../ftr_provider_context';

// Test data: advanced job with partitioning fields so the Scope section is relevant.
// @ts-expect-error not full interface
const JOB_CONFIG: Job = {
  job_id: 'ecom_rule_editor_flyout',
  description:
    'mean(taxless_total_price) over "geoip.city_name" partitionfield=day_of_week on ecommerce dataset with 15m bucket span',
  groups: ['ecommerce', 'automated', 'advanced'],
  analysis_config: {
    bucket_span: '15m',
    detectors: [
      {
        detector_description:
          'mean(taxless_total_price) over "geoip.city_name" partitionfield=day_of_week',
        function: 'mean',
        field_name: 'taxless_total_price',
        over_field_name: 'geoip.city_name',
        partition_field_name: 'day_of_week',
      },
    ],
    influencers: ['day_of_week'],
  },
  data_description: {
    time_field: 'order_date',
    time_format: 'epoch_ms',
  },
  analysis_limits: {
    model_memory_limit: '11mb',
    categorization_examples_limit: 4,
  },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-ecom_rule_editor_flyout',
  indices: ['ft_ecommerce'],
  job_id: 'ecom_rule_editor_flyout',
  query: { bool: { must: [{ match_all: {} }] } },
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('rule editor flyout', function () {
    this.tags(['ml']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/ecommerce');
      await ml.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle('ft_ecommerce');
    });

    it('opens job in single metric viewer and selects entities', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToStackManagementMlSection('anomaly_detection', 'ml-jobs-list');

      await ml.testExecution.logTestStep('open job in single metric viewer');
      await ml.jobTable.filterWithSearchString(JOB_CONFIG.job_id, 1);
      await ml.jobTable.clickOpenJobInSingleMetricViewerButton(JOB_CONFIG.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('select entity values to load results');
      await ml.singleMetricViewer.assertDetectorInputExist();
      await ml.singleMetricViewer.assertDetectorInputValue('0');
      await ml.singleMetricViewer.assertEntityInputExist('day_of_week');
      await ml.singleMetricViewer.selectEntityValue('day_of_week', 'Friday');
      await ml.singleMetricViewer.assertEntityInputExist('geoip.city_name');
      await ml.singleMetricViewer.selectEntityValue('geoip.city_name', 'Abu Dhabi');

      await ml.testExecution.logTestStep('results are visible');
      await ml.singleMetricViewer.assertChartExist();
      await ml.anomaliesTable.assertTableExists();
      await ml.anomaliesTable.assertTableNotEmpty();
    });

    it('opens rule editor flyout and navigates to Filter Lists via Scope callout', async () => {
      await ml.testExecution.logTestStep('open anomalies actions menu and configure rules');
      await ml.anomaliesTable.assertAnomalyActionsMenuButtonExists(0);
      await ml.anomaliesTable.ensureAnomalyActionsMenuOpen(0);
      await ml.anomaliesTable.assertAnomalyActionConfigureRulesButtonExists(0);
      await ml.anomaliesTable.clickConfigureRulesButton(0);

      await ml.testExecution.logTestStep(
        'enable Scope section to show callout when no filter lists exist'
      );
      await ml.ruleEditorFlyout.enableScope();

      await ml.testExecution.logTestStep('click Filter Lists link and verify navigation');
      await ml.ruleEditorFlyout.navigateToFilterListsFromCallout();
    });

    it('shows scope controls when filter lists exist and allows save', async () => {
      const filterId = 'ecom_rule_editor_test_filter';
      await ml.testExecution.logTestStep('ensure at least one filter list exists');
      await ml.api.createFilter(filterId, {
        description: 'Functional test filter list for rule editor flyout',
        items: ['Friday', 'Abu Dhabi'],
      });

      await ml.testExecution.logTestStep('re-open job in single metric viewer');
      await ml.navigation.navigateToStackManagementMlSection('anomaly_detection', 'ml-jobs-list');
      await ml.jobTable.filterWithSearchString(JOB_CONFIG.job_id, 1);
      await ml.jobTable.clickOpenJobInSingleMetricViewerButton(JOB_CONFIG.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
      await ml.singleMetricViewer.assertDetectorInputExist();
      await ml.singleMetricViewer.assertDetectorInputValue('0');
      await ml.singleMetricViewer.selectEntityValue('day_of_week', 'Friday');
      await ml.singleMetricViewer.selectEntityValue('geoip.city_name', 'Abu Dhabi');

      await ml.testExecution.logTestStep('open flyout via actions and enable Scope');
      await ml.anomaliesTable.ensureAnomalyActionsMenuOpen(0);
      await ml.anomaliesTable.assertAnomalyActionConfigureRulesButtonExists(0);
      await ml.anomaliesTable.clickConfigureRulesButton(0);
      await ml.ruleEditorFlyout.enableScope();

      await ml.testExecution.logTestStep('open scope filter selector popover');
      await ml.ruleEditorFlyout.openScopeFilterSelector();

      await ml.testExecution.logTestStep('save rule');
      await ml.ruleEditorFlyout.save();
      await ml.ruleEditorFlyout.closeIfOpen();

      await ml.api.deleteFilter(filterId);
    });
  });
}
