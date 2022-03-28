/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { AnomalyChartsEmbeddableInput, AnomalyChartsServices } from '../types';
import { CoreStart } from 'kibana/public';
import { MlStartDependencies } from '../../plugin';
import { useAnomalyChartsInputResolver } from './use_anomaly_charts_input_resolver';
import { EmbeddableAnomalyChartsContainerProps } from './embeddable_anomaly_charts_container';
import moment from 'moment';
import { createMlResultsServiceMock } from '../../application/services/ml_results_service';
import { createCoreStartMock } from '../../__mocks__/core_start';
import { createMlStartDepsMock } from '../../__mocks__/ml_start_deps';
import { createAnomalyExplorerChartsServiceMock } from '../../application/services/__mocks__/anomaly_explorer_charts_service';
import { createAnomalyDetectorServiceMock } from '../../application/services/__mocks__/anomaly_detector_service';

jest.mock('../common/process_filters', () => ({
  processFilters: jest.fn(),
}));

jest.mock('../../application/explorer/explorer_utils', () => ({
  getSelectionInfluencers: jest.fn(() => {
    return [];
  }),
  getSelectionJobIds: jest.fn(() => ['test-job']),
  getSelectionTimeRange: jest.fn(() => ({ earliestMs: 1521309543000, latestMs: 1616003942999 })),
}));

describe('useAnomalyChartsInputResolver', () => {
  let embeddableInput: BehaviorSubject<Partial<AnomalyChartsEmbeddableInput>>;
  let refresh: Subject<any>;
  let services: [CoreStart, MlStartDependencies, AnomalyChartsServices];
  let onInputChange: jest.Mock;

  const start = moment().subtract(1, 'years');
  const end = moment();

  beforeEach(() => {
    jest.useFakeTimers();

    const jobIds = ['test-job'];
    embeddableInput = new BehaviorSubject({
      id: 'test-explorer-charts-embeddable',
      jobIds,
      filters: [],
      query: { language: 'kuery', query: '' },
      maxSeriesToPlot: 12,
      timeRange: {
        from: 'now-3y',
        to: 'now',
      },
    } as Partial<AnomalyChartsEmbeddableInput>);

    refresh = new Subject();
    const anomalyExplorerChartsServiceMock = createAnomalyExplorerChartsServiceMock();

    anomalyExplorerChartsServiceMock.getTimeBounds.mockReturnValue({
      min: start,
      max: end,
    });

    anomalyExplorerChartsServiceMock.getAnomalyData$.mockImplementation(() =>
      of({
        chartsPerRow: 2,
        seriesToPlot: [],
        tooManyBuckets: false,
        timeFieldName: '@timestamp',
        errorMessages: undefined,
      })
    );

    const coreStartMock = createCoreStartMock();
    const mlStartMock = createMlStartDepsMock();

    const anomalyDetectorServiceMock = createAnomalyDetectorServiceMock();
    anomalyDetectorServiceMock.getJobs$.mockImplementation((jobId: string[]) => {
      if (jobId.includes('invalid-job-id')) {
        throw new Error('Invalid job');
      }
      return of([
        {
          job_id: 'cw_multi_1',
          analysis_config: { bucket_span: '15m' },
        },
      ]);
    });

    services = [
      coreStartMock,
      mlStartMock,
      {
        anomalyDetectorService: anomalyDetectorServiceMock,
        anomalyExplorerService: anomalyExplorerChartsServiceMock,
        mlResultsService: createMlResultsServiceMock(),
      },
    ] as unknown as EmbeddableAnomalyChartsContainerProps['services'];

    onInputChange = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('should fetch jobs only when input job ids have been changed', async () => {
    const { result } = renderHook(() =>
      useAnomalyChartsInputResolver(
        embeddableInput as Observable<AnomalyChartsEmbeddableInput>,
        onInputChange,
        refresh,
        services,
        1000,
        0
      )
    );

    expect(result.current.chartsData).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.isLoading).toBe(true);

    jest.advanceTimersByTime(501);

    const explorerServices = services[2];

    expect(explorerServices.anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(1);
    expect(explorerServices.anomalyExplorerService.getAnomalyData$).toHaveBeenCalledTimes(1);

    embeddableInput.next({
      id: 'test-explorer-charts-embeddable',
      jobIds: ['anotherJobId'],
      filters: [],
      query: { language: 'kuery', query: '' },
      maxSeriesToPlot: 6,
      timeRange: {
        from: 'now-3y',
        to: 'now',
      },
    });
    jest.advanceTimersByTime(501);

    expect(explorerServices.anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(2);
    expect(explorerServices.anomalyExplorerService.getAnomalyData$).toHaveBeenCalledTimes(2);
  });

  test.skip('should not complete the observable on error', async () => {
    const { result } = renderHook(() =>
      useAnomalyChartsInputResolver(
        embeddableInput as Observable<AnomalyChartsEmbeddableInput>,
        onInputChange,
        refresh,
        services,
        1000,
        1
      )
    );

    embeddableInput.next({
      id: 'test-explorer-charts-embeddable',
      jobIds: ['invalid-job-id'],
      filters: [],
      query: { language: 'kuery', query: '' },
    } as Partial<AnomalyChartsEmbeddableInput>);

    expect(result.current.error).toBeDefined();
  });
});
