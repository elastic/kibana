/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { act, renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject, of, Subject } from 'rxjs';
import type { AnomalySwimlaneServices } from '..';
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import type { MlStartDependencies } from '../../plugin';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import type { AnomalySwimLaneEmbeddableApi } from './types';

describe('useSwimlaneInputResolver', () => {
  let jobIds: BehaviorSubject<string[]>;

  let api: AnomalySwimLaneEmbeddableApi;
  let refresh: Subject<any>;
  let services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices];

  const renderCallbacks = {
    onLoading: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();

    jobIds = new BehaviorSubject(['test-job']);

    api = {
      jobIds,
      swimlaneType: new BehaviorSubject(SWIMLANE_TYPE.OVERALL),
      fromPage: new BehaviorSubject(1),
      perPage: new BehaviorSubject(10),
      viewBy: new BehaviorSubject(undefined),
      query$: new BehaviorSubject(undefined),
      filters$: new BehaviorSubject(undefined),
      appliedTimeRange$: new BehaviorSubject({
        from: '2019-11-04T16:00:00.000Z',
        to: '2019-11-04T21:30:00.000Z',
      }),
      setInterval: jest.fn(),
    } as unknown as AnomalySwimLaneEmbeddableApi;

    refresh = new Subject();

    services = [
      {
        uiSettings: {
          get: jest.fn(() => {
            return null;
          }),
        } as unknown as IUiSettingsClient,
      } as CoreStart,
      null as unknown as MlStartDependencies,
      {
        anomalyTimelineService: {
          setTimeRange: jest.fn(),
          loadOverallData: jest.fn(() =>
            Promise.resolve({
              earliest: 0,
              latest: 0,
              points: [],
              interval: 3600,
            })
          ),
          loadViewBySwimlane: jest.fn(() =>
            Promise.resolve({
              points: [],
            })
          ),
          getSwimlaneBucketInterval: jest.fn(() => {
            return {
              asSeconds: jest.fn(() => 900),
            };
          }),
        },
        anomalyDetectorService: {
          getJobs$: jest.fn((jobId: string[]) => {
            if (jobId.includes('invalid-job-id')) {
              throw new Error('Invalid job');
            }
            return of([
              {
                job_id: 'cw_multi_1',
                analysis_config: { bucket_span: '15m' },
              },
            ]);
          }),
        },
      } as unknown as AnomalySwimlaneServices,
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('should fetch jobs only when input job ids have been changed', async () => {
    const { result } = renderHook(() =>
      useSwimlaneInputResolver(api, refresh, services, 1000, renderCallbacks)
    );

    expect(result.current[0]).toBe(undefined);
    expect(result.current[1]).toBe(undefined);

    act(() => {
      jest.advanceTimersByTime(501);
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(1);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(1);

    expect(renderCallbacks.onLoading).toHaveBeenCalledTimes(1);

    act(() => {
      jobIds.next(['another-id']);
      jest.advanceTimersByTime(501);
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(2);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(2);

    expect(renderCallbacks.onLoading).toHaveBeenCalledTimes(2);

    await act(async () => {
      jobIds.next(['another-id']);
      jest.advanceTimersByTime(501);
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(2);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(3);

    expect(renderCallbacks.onLoading).toHaveBeenCalledTimes(3);
  });

  test('should not complete the observable on error', () => {
    const { result } = renderHook(() =>
      useSwimlaneInputResolver(api, refresh, services, 1000, renderCallbacks)
    );

    act(() => {
      jobIds.next(['invalid-job-id']);
    });

    expect(result.current[4]?.message).toBe('Invalid job');

    expect(renderCallbacks.onError).toHaveBeenCalledTimes(1);
  });
});
