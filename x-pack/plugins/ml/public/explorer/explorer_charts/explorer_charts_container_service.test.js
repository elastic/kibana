/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockAnomalyChartRecords from './mock_anomaly_chart_records.json';
import mockDetectorsByJob from './mock_detectors_by_job.json';
import mockJobConfig from './mock_job_config.json';
import mockSeriesConfig from './mock_series_config_farequote.json';
import mockSeriesToPlot from './mock_series_to_plot_farequote.json';

jest.mock('../../services/job_service',
  () => ({
    mlJobService: {
      getJob() { return mockJobConfig; },
      detectorsByJob: mockDetectorsByJob
    }
  })
);

jest.mock('../../util/string_utils',
  () => ({
    mlEscape(d) { console.warn('escape', d); return d; }
  })
);

const mockMlSelectSeverityService = {
  state: {
    get() { return { display: 'warning', val: 0 }; }
  }
};

const mockChartContainer = {
  width() { return 1600; }
};

function mockGetDefaultData() {
  return {
    seriesToPlot: [],
    layoutCellsPerChart: 12,
    tooManyBuckets: false,
    timeFieldName: 'timestamp'
  };
}

import { explorerChartsContainerServiceFactory } from './explorer_charts_container_service';

describe('explorerChartsContainerService', () => {
  test('Initialize factory', (done) => {
    explorerChartsContainerServiceFactory(
      mockMlSelectSeverityService,
      callback
    );

    function callback(data) {
      expect(data).toEqual(mockGetDefaultData());
      done();
    }
  });

  test('call anomalyChangeListener with empty series config', (done) => {
    // callback will be called multiple times.
    // the callbackData array contains the expected data values for each consecutive call.
    const callbackData = [];
    callbackData.push(mockGetDefaultData());
    callbackData.push({
      ...mockGetDefaultData(),
      layoutCellsPerChart: 6
    });

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(
      mockMlSelectSeverityService,
      callback,
      mockChartContainer
    );

    anomalyDataChangeListener(
      [],
      mockSeriesConfig.selectedEarliest,
      mockSeriesConfig.selectedLatest
    );

    function callback(data) {
      if (callbackData.length > 0) {
        expect(data).toEqual(callbackData.shift());
      }
      if (callbackData.length === 0) {
        done();
      }
    }
  });

  test('call anomalyChangeListener with actual series config', (done) => {
    // callback will be called multiple times.
    // the callbackData array contains the expected data values for each consecutive call.
    const callbackData = [];
    callbackData.push(mockGetDefaultData());
    callbackData.push({
      ...mockGetDefaultData(),
      seriesToPlot: mockSeriesToPlot,
      layoutCellsPerChart: 6
    });

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(
      mockMlSelectSeverityService,
      callback,
      mockChartContainer
    );

    anomalyDataChangeListener(
      mockAnomalyChartRecords,
      mockSeriesConfig.selectedEarliest,
      mockSeriesConfig.selectedLatest
    );

    function callback(data) {
      if (callbackData.length > 0) {
        expect(data).toEqual(callbackData.shift());
      }
      if (callbackData.length === 0) {
        done();
      }
    }
  });
});
