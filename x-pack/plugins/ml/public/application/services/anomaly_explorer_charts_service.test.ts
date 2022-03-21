/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomalyExplorerChartsService } from './anomaly_explorer_charts_service';
import mockAnomalyChartRecords from '../explorer/explorer_charts/__mocks__/mock_anomaly_chart_records.json';
import mockJobConfig from '../explorer/explorer_charts/__mocks__/mock_job_config.json';
import mockSeriesPromisesResponse from '../explorer/explorer_charts/__mocks__/mock_series_promises_response.json';
import { of } from 'rxjs';
import { cloneDeep } from 'lodash';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { ExplorerChartsData } from '../explorer/explorer_charts/explorer_charts_container_service';
import type { MlApiServices } from './ml_api_service';
import type { MlResultsService } from './results_service';
import { getDefaultChartsData } from '../explorer/explorer_charts/explorer_charts_container_service';
import { timefilterMock } from '../contexts/kibana/__mocks__/use_timefilter';
import { mlApiServicesMock } from './__mocks__/ml_api_services';

// Some notes on the tests and mocks:
//
// 'call anomalyChangeListener with actual series config'
// This test uses the standard mocks and uses the data as is provided via the mock files.
// The mocked services check for values in the data (e.g. 'mock-job-id', 'farequote-2017')
// and return the mock data from the files.
//
// 'filtering should skip values of null'
// This is is used to verify that values of `null` get filtered out but `0` is kept.
// The test clones mock data from files and adjusts job_id and indices to trigger
// suitable responses from the mocked services. The mocked services check against the
// provided alternative values and return specific modified mock responses for the test case.

const mockJobConfigClone = cloneDeep(mockJobConfig);

// adjust mock data to tests against null/0 values
const mockMetricClone = cloneDeep(mockSeriesPromisesResponse[0][0]);
// @ts-ignore
mockMetricClone.results['1486712700000'] = null;
// @ts-ignore
mockMetricClone.results['1486713600000'] = 0;

export const mlResultsServiceMock = {
  getMetricData: jest.fn((indices) => {
    // this is for 'call anomalyChangeListener with actual series config'
    if (indices[0] === 'farequote-2017') {
      return of(mockSeriesPromisesResponse[0][0]);
    }
    // this is for 'filtering should skip values of null'
    return of(mockMetricClone);
  }),
  getRecordsForCriteria: jest.fn(() => {
    return of(mockSeriesPromisesResponse[0][1]);
  }),
  getScheduledEventsByBucket: jest.fn(() => of(mockSeriesPromisesResponse[0][2])),
  getEventDistributionData: jest.fn((indices) => {
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
  }),
};

const assertAnomalyDataResult = (anomalyData: ExplorerChartsData) => {
  expect(anomalyData.chartsPerRow).toBe(1);
  expect(Array.isArray(anomalyData.seriesToPlot)).toBe(true);
  expect(anomalyData.seriesToPlot.length).toBe(1);
  expect(anomalyData.errorMessages).toMatchObject({});
  expect(anomalyData.tooManyBuckets).toBe(false);
  expect(anomalyData.timeFieldName).toBe('timestamp');
};
describe('AnomalyExplorerChartsService', () => {
  const jobId = 'mock-job-id';
  const combinedJobRecords = {
    [jobId]: mockJobConfigClone,
  };
  const anomalyExplorerService = new AnomalyExplorerChartsService(
    timefilterMock,
    mlApiServicesMock as unknown as MlApiServices,
    mlResultsServiceMock as unknown as MlResultsService
  );

  const timeRange = {
    earliestMs: 1486656000000,
    latestMs: 1486670399999,
  };

  beforeEach(() => {
    mlApiServicesMock.jobs.jobForCloning.mockImplementation(() =>
      Promise.resolve({ job: mockJobConfigClone, datafeed: mockJobConfigClone.datafeed_config })
    );
  });

  test('should return anomaly data without explorer service', async () => {
    const anomalyData = (await anomalyExplorerService.getAnomalyData$(
      undefined,
      combinedJobRecords as unknown as Record<string, CombinedJob>,
      1000,
      mockAnomalyChartRecords,
      timeRange.earliestMs,
      timeRange.latestMs,
      timefilterMock,
      0,
      12
    )) as ExplorerChartsData;
    assertAnomalyDataResult(anomalyData);
  });

  test('call anomalyChangeListener with empty series config', async () => {
    const anomalyData = (await anomalyExplorerService.getAnomalyData$(
      undefined,
      // @ts-ignore
      combinedJobRecords as unknown as Record<string, CombinedJob>,
      1000,
      [],
      timeRange.earliestMs,
      timeRange.latestMs,
      timefilterMock,
      0,
      12
    )) as ExplorerChartsData;
    expect(anomalyData).toStrictEqual({
      ...getDefaultChartsData(),
      chartsPerRow: 2,
    });
  });

  test('field value with trailing dot should not throw an error', async () => {
    const mockAnomalyChartRecordsClone = cloneDeep(mockAnomalyChartRecords);
    mockAnomalyChartRecordsClone[1].partition_field_value = 'AAL.';

    const anomalyData = (await anomalyExplorerService.getAnomalyData$(
      undefined,
      combinedJobRecords as unknown as Record<string, CombinedJob>,
      1000,
      mockAnomalyChartRecordsClone,
      timeRange.earliestMs,
      timeRange.latestMs,
      timefilterMock,
      0,
      12
    )) as ExplorerChartsData;
    expect(anomalyData).toBeDefined();
    expect(anomalyData!.chartsPerRow).toBe(2);
    expect(Array.isArray(anomalyData!.seriesToPlot)).toBe(true);
    expect(anomalyData!.seriesToPlot.length).toBe(2);
  });
});
