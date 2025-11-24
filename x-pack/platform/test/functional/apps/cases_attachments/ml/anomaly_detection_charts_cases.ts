/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-plugin/public';
import type { AnomalySwimlaneEmbeddableStateViewBy } from '@kbn/ml-plugin/public/embeddables/anomaly_swimlane/types';
import { SWIMLANE_TYPE } from '@kbn/ml-plugin/server/embeddable/schemas';
import { stringHash } from '@kbn/ml-string-hash';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';

// @ts-expect-error not full interface
const JOB_CONFIG: Job = {
  job_id: `fq_multi_1_ae`,
  description:
    'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [
      { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_ae',
  indices: ['ft_farequote'],
  job_id: 'fq_multi_1_ae',
  query: { bool: { must: [{ match_all: {} }] } },
};

const overallSwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneOverall';

const cellSize = 15;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const elasticChart = getService('elasticChart');

  describe('anomaly detection result views - cases attachments', function () {
    this.tags(['ml', 'cases']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
    });

    describe('with farequote based multi metric job', function () {
      before(async () => {
        await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
      });

      after(async () => {
        await elasticChart.setNewChartUiDebugFlag(false);
        await ml.api.cleanMlIndices();
      });

      describe('Anomaly Swim Lane as embeddable', function () {
        beforeEach(async () => {
          await ml.navigation.navigateToAnomalyExplorer(JOB_CONFIG.job_id, {
            from: '2016-02-07T00%3A00%3A00.000Z',
            to: '2016-02-11T23%3A59%3A54.000Z',
          });
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
          await ml.commonUI.waitForDatePickerIndicatorLoaded();
        });

        it('attaches swim lane embeddable to a case', async () => {
          await ml.anomalyExplorer.attachSwimLaneToCase('viewBy', {
            title: 'ML Test case',
            description: 'Case with an anomaly swim lane',
            tag: 'ml_swim_lane_case',
          });

          const attachmentData: Omit<AnomalySwimlaneEmbeddableStateViewBy, 'id'> = {
            swimlaneType: SWIMLANE_TYPE.VIEW_BY,
            viewBy: 'airline',
            jobIds: [JOB_CONFIG.job_id],
            timeRange: {
              from: '2016-02-07T00:00:00.000Z',
              to: '2016-02-11T23:59:54.000Z',
            },
          };

          const expectedAttachment: AnomalySwimLaneEmbeddableState = {
            ...attachmentData,
            id: stringHash(JSON.stringify(attachmentData)).toString(),
          };

          await ml.cases.assertCaseWithAnomalySwimLaneAttachment(
            {
              title: 'ML Test case',
              description: 'Case with an anomaly swim lane',
              tag: 'ml_swim_lane_case',
              reporter: USER.ML_POWERUSER,
            },
            expectedAttachment,
            {
              yAxisLabelCount: 10,
            }
          );
        });
      });

      describe('Anomaly Charts as embeddable', function () {
        beforeEach(async () => {
          await ml.navigation.navigateToAnomalyExplorer(
            JOB_CONFIG.job_id,
            {
              from: '2016-02-07T00%3A00%3A00.000Z',
              to: '2016-02-11T23%3A59%3A54.000Z',
            },
            () => elasticChart.setNewChartUiDebugFlag(true)
          );

          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
          await ml.commonUI.waitForDatePickerIndicatorLoaded();

          await ml.testExecution.logTestStep('clicks on the Overall swim lane cell');
          const sampleCell = (await ml.swimLane.getCells(overallSwimLaneTestSubj))[0];
          await ml.swimLane.selectSingleCell(overallSwimLaneTestSubj, {
            x: sampleCell.x + cellSize,
            y: sampleCell.y + cellSize,
          });
          await ml.swimLane.waitForSwimLanesToLoad();
        });

        it('attaches an embeddable to a case', async () => {
          await ml.anomalyExplorer.attachAnomalyChartsToCase({
            title: 'ML Charts Test case',
            description: 'Case with an anomaly charts attachment',
            tag: 'ml_anomaly_charts',
          });

          const expectedAttachment = {
            jobIds: [JOB_CONFIG.job_id],
            maxSeriesToPlot: 6,
          };

          // @ts-expect-error Setting id to be undefined here
          // since time range expected is of the chart plotEarliest/plotLatest, not of the global time range
          // but, chart time range might vary depends on the time of the test
          // we don't know the hashed string id for sure
          expectedAttachment.id = undefined;

          await ml.cases.assertCaseWithAnomalyChartsAttachment(
            {
              title: 'ML Charts Test case',
              description: 'Case with an anomaly charts attachment',
              tag: 'ml_anomaly_charts',
              reporter: USER.ML_POWERUSER,
            },
            expectedAttachment,
            6
          );
        });
      });
    });
  });
}
