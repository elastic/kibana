/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import type { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const AD_JOB_ID = 'rt-anomaly-mean-value-ui';
const DATAFEED_ID = `datafeed-${AD_JOB_ID}`;
const BASIC_TEST_DATA_INDEX = `rt-ad-basic-data-anomalies-ui`;

function getAnomalyDetectionConfig(): Job {
  return {
    job_id: AD_JOB_ID,
    description: '',
    groups: ['real-time', 'anomaly-alerting-ui'],
    analysis_config: {
      bucket_span: '1m',
      detectors: [{ function: 'mean', field_name: 'value', partition_field_name: 'key' }],
      influencers: ['key'],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '11MB' },
    model_plot_config: { enabled: true, annotations_enabled: true },
  } as Job;
}

function getDatafeedConfig(): Datafeed {
  return {
    indices: [BASIC_TEST_DATA_INDEX],
    query: { bool: { must: [{ match_all: {} }] } },
    runtime_mappings: {},
    query_delay: '5s',
    frequency: '10s',
    job_id: AD_JOB_ID,
    datafeed_id: DATAFEED_ID,
  } as Datafeed;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  // const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  // const supertest = getService('supertest');
  const pageObjects = getPageObjects(['triggersActionsUI', 'timePicker']);
  const elasticChart = getService('elasticChart');
  // const retry = getService('retry');
  // const find = getService('find');

  async function createSourceIndex() {
    await ml.api.createIndex(BASIC_TEST_DATA_INDEX, {
      properties: {
        '@timestamp': { type: 'date' },
        value: { type: 'integer' },
        key: { type: 'keyword' },
      },
    });
  }

  async function ingestNormalDocs(
    indexName: string,
    hoursAgo: number = 24,
    hoursFromNow: number = 4,
    secondsBetweenDocs: number = 30
  ) {
    const timestamp = Date.now();
    const start = timestamp - duration(hoursAgo, 'h').asMilliseconds();
    const end = timestamp - duration(hoursFromNow, 'h').asMilliseconds();

    const step = duration(secondsBetweenDocs, 's').asMilliseconds();
    let docTime = start;
    const docs: Array<{ _index: string; '@timestamp': number; value: number; key: string }> = [];
    while (docTime + step < end) {
      for (const key of ['first-key', 'second-key', 'third-key']) {
        docs.push({
          _index: indexName,
          '@timestamp': docTime,
          value: Math.floor(Math.random() * 10 + 1),
          key,
        });
      }
      docTime += step;
    }

    if (docs.length > 0) {
      const operations = docs.flatMap(({ _index, ...doc }) => [{ index: { _index } }, doc]);
      await es.bulk({ refresh: 'wait_for', operations });
    }
  }

  async function ingestAnomalousDoc(indexName: string) {
    await es.index({
      refresh: 'wait_for',
      index: indexName,
      body: { '@timestamp': Date.now(), value: 10 * 1000, key: 'first-key' },
    });
  }

  describe('ML app - anomaly explorer alerts table', function () {
    this.tags(['ml']);

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      await createSourceIndex();
      await ingestNormalDocs(BASIC_TEST_DATA_INDEX);

      await ml.api.createAnomalyDetectionJob(getAnomalyDetectionConfig());
      await ml.api.createDatafeed(getDatafeedConfig());
      await ml.api.openAnomalyDetectionJob(AD_JOB_ID);
      await ml.api.startDatafeed(DATAFEED_ID);
    });

    after(async () => {
      await ml.alerting.cleanAnomalyDetectionRules();
      await ml.api.deleteAnomalyDetectionJobES(AD_JOB_ID);
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices(BASIC_TEST_DATA_INDEX);
      await elasticChart.setNewChartUiDebugFlag(false);
    });

    it('shows alerts table in explorer after rule fires', async () => {
      await ml.navigation.navigateToAlertsAndAction();
      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      await ml.alerting.selectAnomalyDetectionAlertType();

      await ml.alerting.selectJobs([AD_JOB_ID]);
      await ml.alerting.selectResultType('bucket');
      await ml.alerting.setIncludeInterim(true);
      await ml.alerting.setSeverity(0);

      const ruleName = 'ml-explorer-alert-ui';
      await pageObjects.triggersActionsUI.setAlertName(ruleName);
      await pageObjects.triggersActionsUI.setAlertInterval(10, 's');
      await pageObjects.triggersActionsUI.saveAlert();

      await ingestAnomalousDoc(BASIC_TEST_DATA_INDEX);
      // Wait for bucket to finalize
      await sleep(60 * 1000);

      await ml.navigation.navigateToAnomalyExplorer(AD_JOB_ID, { from: 'now-24h', to: 'now' }, () =>
        elasticChart.setNewChartUiDebugFlag(true)
      );
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
      await ml.commonUI.waitForDatePickerIndicatorLoaded();

      await testSubjects.existOrFail('mlAlertsPanelToggle');

      // Select the entire Overall swim lane (brush across the full row) to ensure alerts are included
      await ml.swimLane.waitForSwimLanesToLoad();
      const overallSwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneOverall';
      const cells = await ml.swimLane.getCells(overallSwimLaneTestSubj);
      const firstCell = cells[0];
      const lastCell = cells[cells.length - 1];
      await ml.swimLane.selectCells(overallSwimLaneTestSubj, {
        x1: firstCell.x + 10,
        y1: firstCell.y + 10,
        x2: lastCell.x + 10,
        y2: lastCell.y + 10,
      });
      await ml.swimLane.waitForSwimLanesToLoad();

      // Verify the swimlane alerts popover and mini alerts table are shown
      await testSubjects.existOrFail('mlSwimLaneWrapper');
      await testSubjects.existOrFail('mlSwimLaneAlertsPopover');
      await testSubjects.existOrFail('mlSwimLaneAlertsMiniTable');
      await testSubjects.missingOrFail('alertsTableEmptyState');
    });
  });
}
