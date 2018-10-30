/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockAnomalyChartRecords from './__mocks__/mock_anomaly_chart_records.json';
import mockDetectorsByJob from './__mocks__/mock_detectors_by_job.json';
import mockJobConfig from './__mocks__/mock_job_config.json';
import mockSeriesPromisesResponse from './__mocks__/mock_series_promises_response.json';

jest.mock('../../services/job_service', () => ({
  mlJobService: {
    getJob() { return mockJobConfig; },
    detectorsByJob: mockDetectorsByJob
  }
}));

jest.mock('../../services/results_service', () => ({
  mlResultsService: {
    getMetricData() {
      return Promise.resolve(mockSeriesPromisesResponse[0][0]);
    },
    getRecordsForCriteria() {
      return Promise.resolve(mockSeriesPromisesResponse[0][1]);
    },
    getScheduledEventsByBucket() {
      return Promise.resolve(mockSeriesPromisesResponse[0][2]);
    },
    getEventDistributionData() {
      return Promise.resolve([]);
    }
  }
}));

jest.mock('../../util/string_utils', () => ({
  mlEscape(d) { return d; }
}));

jest.mock('ui/chrome', () => ({
  getBasePath: (path) => path,
  getUiSettingsClient: () => ({
    get: () => null
  }),
}));

const mockMlSelectSeverityService = {
  state: {
    get() { return { display: 'warning', val: 0 }; }
  }
};

const mockChartContainer = {
  width() { return 1140; }
};

function mockGetDefaultData() {
  return {
    seriesToPlot: [],
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
      chartsPerRow: 2
    });

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(
      mockMlSelectSeverityService,
      callback,
      mockChartContainer
    );

    anomalyDataChangeListener(
      [],
      1486656000000,
      1486670399999
    );

    function callback(data) {
      if (callbackData.length > 0) {
        expect(data).toEqual({
          ...callbackData.shift()
        });
      }
      if (callbackData.length === 0) {
        done();
      }
    }
  });

  test('call anomalyChangeListener with actual series config', (done) => {
    let testCount = 0;
    const expectedTestCount = 3;

    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(
      mockMlSelectSeverityService,
      callback,
      mockChartContainer
    );

    anomalyDataChangeListener(
      mockAnomalyChartRecords,
      1486656000000,
      1486670399999
    );

    function callback(data) {
      testCount++;
      expect(data).toMatchSnapshot();
      if (testCount === expectedTestCount) {
        done();
      }
    }
  });
});
