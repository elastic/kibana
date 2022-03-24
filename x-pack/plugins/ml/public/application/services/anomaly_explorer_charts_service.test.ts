/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomalyExplorerChartsService } from './anomaly_explorer_charts_service';
import { of } from 'rxjs';
import type { MlApiServices } from './ml_api_service';
import type { MlResultsService } from './results_service';
import { createTimefilterMock } from '../contexts/kibana/__mocks__/use_timefilter';
import moment from 'moment';
import { getDefaultChartsData } from '../explorer/explorer_charts/explorer_charts_container_service';

export const mlResultsServiceMock = {};

describe('AnomalyExplorerChartsService', () => {
  const jobId = 'mock-job-id';

  let anomalyExplorerService: jest.Mocked<AnomalyExplorerChartsService>;

  let timefilterMock;

  const timeRange = {
    earliestMs: 1486656000000,
    latestMs: 1486670399999,
  };

  const mlApiServicesMock = {
    jobs: {
      jobForCloning: jest.fn(),
    },
    results: {
      getAnomalyCharts$: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();

    mlApiServicesMock.jobs.jobForCloning.mockImplementation(() => Promise.resolve({}));

    mlApiServicesMock.results.getAnomalyCharts$.mockReturnValue(
      of({
        ...getDefaultChartsData(),
        seriesToPlot: [{}],
      })
    );

    timefilterMock = createTimefilterMock();
    timefilterMock.getActiveBounds.mockReturnValue({
      min: moment(1486656000000),
      max: moment(1486670399999),
    });

    anomalyExplorerService = new AnomalyExplorerChartsService(
      timefilterMock,
      mlApiServicesMock as unknown as MlApiServices,
      mlResultsServiceMock as unknown as MlResultsService
    ) as jest.Mocked<AnomalyExplorerChartsService>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('fetches anomaly charts data', () => {
    let result;
    anomalyExplorerService
      .getAnomalyData$([jobId], 1000, timeRange.earliestMs, timeRange.latestMs)
      .subscribe((d) => {
        result = d;
      });

    expect(mlApiServicesMock.results.getAnomalyCharts$).toHaveBeenCalledWith(
      [jobId],
      [],
      0,
      1486656000000,
      1486670399999,
      { max: 1486670399999, min: 1486656000000 },
      6,
      119,
      undefined
    );
    expect(result).toEqual({
      chartsPerRow: 1,
      errorMessages: undefined,
      seriesToPlot: [{}],
      // default values, will update on every re-render
      tooManyBuckets: false,
      timeFieldName: 'timestamp',
    });
  });
});
