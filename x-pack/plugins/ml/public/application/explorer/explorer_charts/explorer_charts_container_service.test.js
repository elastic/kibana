/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import mockAnomalyChartRecords from './__mocks__/mock_anomaly_chart_records.json';
import mockDetectorsByJob from './__mocks__/mock_detectors_by_job.json';
import mockJobConfig from './__mocks__/mock_job_config.json';
import mockSeriesPromisesResponse from './__mocks__/mock_series_promises_response.json';

// Some notes on the tests and mocks:
//
// 'call anomalyChangeListener with actual series config'
// This test uses the standard mocks and uses the data as is provided via the mock files.
// The mocked services check for values in the data (e.g. 'mock-job-id', 'farequore-2017')
// and return the mock data from the files.
//
// 'filtering should skip values of null'
// This is is used to verify that values of `null` get filtered out but `0` is kept.
// The test clones mock data from files and adjusts job_id and indices to trigger
// suitable responses from the mocked services. The mocked services check against the
// provided alternative values and return specific modified mock responses for the test case.

const mockJobConfigClone = _.cloneDeep(mockJobConfig);

// adjust mock data to tests against null/0 values
const mockMetricClone = _.cloneDeep(mockSeriesPromisesResponse[0][0]);
mockMetricClone.results['1486712700000'] = null;
mockMetricClone.results['1486713600000'] = 0;

jest.mock('../../services/job_service', () => ({
  mlJobService: {
    getJob(jobId) {
      // this is for 'call anomalyChangeListener with actual series config'
      if (jobId === 'mock-job-id') {
        return mockJobConfig;
      }
      // this is for 'filtering should skip values of null'
      mockJobConfigClone.datafeed_config.indices = [`farequote-2017-${jobId}`];
      return mockJobConfigClone;
    },
    detectorsByJob: mockDetectorsByJob,
  },
}));

jest.mock('../../services/results_service', () => {
  const { of } = require('rxjs');
  return {
    mlResultsService: {
      getMetricData(indices) {
        // this is for 'call anomalyChangeListener with actual series config'
        if (indices[0] === 'farequote-2017') {
          return of(mockSeriesPromisesResponse[0][0]);
        }
        // this is for 'filtering should skip values of null'
        return of(mockMetricClone);
      },
      getRecordsForCriteria() {
        return of(mockSeriesPromisesResponse[0][1]);
      },
      getScheduledEventsByBucket() {
        return of(mockSeriesPromisesResponse[0][2]);
      },
      getEventDistributionData(indices) {
        // this is for 'call anomalyChangeListener with actual series config'
        if (indices[0] === 'farequote-2017') {
          return Promise.resolve([]);
        }
        // this is for 'filtering should skip values of null' and
        // resolves with a dummy object to trigger the processing
        // of the event distribution chartdata filtering
        return Promise.resolve([
          {
            entity: 'mock',
          },
        ]);
      },
    },
  };
});

jest.mock('../../util/string_utils', () => ({
  mlEscape(d) {
    return d;
  },
}));

jest.mock('../legacy_utils', () => ({
  getChartContainerWidth() {
    return 1140;
  },
}));

jest.mock('../explorer_dashboard_service', () => ({
  explorerService: {
    setCharts: jest.fn(),
  },
}));

import { anomalyDataChange, getDefaultChartsData } from './explorer_charts_container_service';
import { explorerService } from '../explorer_dashboard_service';

describe('explorerChartsContainerService', () => {
  afterEach(() => {
    explorerService.setCharts.mockClear();
  });

  test('call anomalyChangeListener with empty series config', (done) => {
    anomalyDataChange([], 1486656000000, 1486670399999);

    setImmediate(() => {
      expect(explorerService.setCharts.mock.calls.length).toBe(1);
      expect(explorerService.setCharts.mock.calls[0][0]).toStrictEqual({
        ...getDefaultChartsData(),
        chartsPerRow: 2,
      });
      done();
    });
  });

  test('call anomalyChangeListener with actual series config', (done) => {
    anomalyDataChange(mockAnomalyChartRecords, 1486656000000, 1486670399999);

    setImmediate(() => {
      expect(explorerService.setCharts.mock.calls.length).toBe(2);
      expect(explorerService.setCharts.mock.calls[0][0]).toMatchSnapshot();
      expect(explorerService.setCharts.mock.calls[1][0]).toMatchSnapshot();
      done();
    });
  });

  test('filtering should skip values of null', (done) => {
    const mockAnomalyChartRecordsClone = _.cloneDeep(mockAnomalyChartRecords).map((d) => {
      d.job_id = 'mock-job-id-distribution';
      return d;
    });

    anomalyDataChange(mockAnomalyChartRecordsClone, 1486656000000, 1486670399999);

    setImmediate(() => {
      expect(explorerService.setCharts.mock.calls.length).toBe(2);
      expect(explorerService.setCharts.mock.calls[0][0].seriesToPlot.length).toBe(1);
      expect(explorerService.setCharts.mock.calls[1][0].seriesToPlot.length).toBe(1);

      // the mock source dataset has a length of 115. one data point has a value of `null`,
      // and another one `0`. the received dataset should have a length of 114,
      // it should remove the datapoint with `null` and keep the one with `0`.
      const chartData = explorerService.setCharts.mock.calls[1][0].seriesToPlot[0].chartData;
      expect(chartData).toHaveLength(114);
      expect(chartData.filter((d) => d.value === 0)).toHaveLength(1);
      expect(chartData.filter((d) => d.value === null)).toHaveLength(0);
      done();
    });
  });

  test('field value with trailing dot should not throw an error', (done) => {
    const mockAnomalyChartRecordsClone = _.cloneDeep(mockAnomalyChartRecords);
    mockAnomalyChartRecordsClone[1].partition_field_value = 'AAL.';

    expect(() => {
      anomalyDataChange(mockAnomalyChartRecordsClone, 1486656000000, 1486670399999);
    }).not.toThrow();

    setImmediate(() => {
      expect(explorerService.setCharts.mock.calls.length).toBe(2);
      done();
    });
  });
});
