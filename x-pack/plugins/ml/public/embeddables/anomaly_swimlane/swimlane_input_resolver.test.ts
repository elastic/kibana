/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import { CoreStart, IUiSettingsClient } from 'kibana/public';
import { MlStartDependencies } from '../../plugin';
import { AnomalySwimlaneEmbeddableInput, AnomalySwimlaneServices } from '..';

describe('useSwimlaneInputResolver', () => {
  let embeddableInput: BehaviorSubject<Partial<AnomalySwimlaneEmbeddableInput>>;
  let refresh: Subject<any>;
  let services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices];
  let onInputChange: jest.Mock;

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const renderCallbacks = {
    onRenderComplete: jest.fn(),
    onLoading: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    embeddableInput = new BehaviorSubject({
      id: 'test-swimlane-embeddable',
      jobIds: ['test-job'],
      swimlaneType: SWIMLANE_TYPE.OVERALL,
      filters: [],
      query: { language: 'kuery', query: '' },
    } as Partial<AnomalySwimlaneEmbeddableInput>);
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
    onInputChange = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch jobs only when input job ids have been changed', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSwimlaneInputResolver(
        embeddableInput as Observable<AnomalySwimlaneEmbeddableInput>,
        onInputChange,
        refresh,
        services,
        1000,
        1,
        renderCallbacks
      )
    );

    expect(result.current[0]).toBe(undefined);
    expect(result.current[1]).toBe(undefined);

    await act(async () => {
      await Promise.all([delay(501), waitForNextUpdate()]);
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(1);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(1);

    expect(renderCallbacks.onLoading).toHaveBeenCalledTimes(1);
    expect(renderCallbacks.onRenderComplete).toHaveBeenCalledTimes(1);

    await act(async () => {
      embeddableInput.next({
        id: 'test-swimlane-embeddable',
        jobIds: ['another-id'],
        swimlaneType: SWIMLANE_TYPE.OVERALL,
        filters: [],
        query: { language: 'kuery', query: '' },
      });
      await Promise.all([delay(501), waitForNextUpdate()]);
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(2);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(2);

    expect(renderCallbacks.onLoading).toHaveBeenCalledTimes(2);
    expect(renderCallbacks.onRenderComplete).toHaveBeenCalledTimes(2);

    await act(async () => {
      embeddableInput.next({
        id: 'test-swimlane-embeddable',
        jobIds: ['another-id'],
        swimlaneType: SWIMLANE_TYPE.OVERALL,
        filters: [],
        query: { language: 'kuery', query: '' },
      });
      await Promise.all([delay(501), waitForNextUpdate()]);
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(2);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(3);

    expect(renderCallbacks.onLoading).toHaveBeenCalledTimes(3);
    expect(renderCallbacks.onRenderComplete).toHaveBeenCalledTimes(3);
  });

  test('should not complete the observable on error', async () => {
    const { result } = renderHook(() =>
      useSwimlaneInputResolver(
        embeddableInput as Observable<AnomalySwimlaneEmbeddableInput>,
        onInputChange,
        refresh,
        services,
        1000,
        1,
        renderCallbacks
      )
    );

    await act(async () => {
      embeddableInput.next({
        id: 'test-swimlane-embeddable',
        jobIds: ['invalid-job-id'],
        swimlaneType: SWIMLANE_TYPE.OVERALL,
        filters: [],
        query: { language: 'kuery', query: '' },
      } as Partial<AnomalySwimlaneEmbeddableInput>);
    });

    expect(result.current[6]?.message).toBe('Invalid job');

    expect(renderCallbacks.onError).toHaveBeenCalledTimes(1);
  });
});
