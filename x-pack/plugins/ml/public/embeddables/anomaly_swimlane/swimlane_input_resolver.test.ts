/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { processFilters, useSwimlaneInputResolver } from './swimlane_input_resolver';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneServices,
} from './anomaly_swimlane_embeddable';
import { CoreStart, IUiSettingsClient } from 'kibana/public';
import { MlStartDependencies } from '../../plugin';

describe('useSwimlaneInputResolver', () => {
  let embeddableInput: BehaviorSubject<Partial<AnomalySwimlaneEmbeddableInput>>;
  let refresh: Subject<any>;
  let services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices];
  let onInputChange: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

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
        uiSettings: ({
          get: jest.fn(() => {
            return null;
          }),
        } as unknown) as IUiSettingsClient,
      } as CoreStart,
      (null as unknown) as MlStartDependencies,
      ({
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
        },
        anomalyDetectorService: {
          getJobs$: jest.fn(() =>
            of([
              {
                job_id: 'cw_multi_1',
                analysis_config: { bucket_span: '15m' },
              },
            ])
          ),
        },
      } as unknown) as AnomalySwimlaneServices,
    ];
    onInputChange = jest.fn();
  });
  afterEach(() => {
    jest.useRealTimers();
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
        1
      )
    );

    expect(result.current[0]).toBe(undefined);
    expect(result.current[1]).toBe(undefined);

    await act(async () => {
      jest.advanceTimersByTime(501);
      await waitForNextUpdate();
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(1);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(1);

    await act(async () => {
      embeddableInput.next({
        id: 'test-swimlane-embeddable',
        jobIds: ['another-id'],
        swimlaneType: SWIMLANE_TYPE.OVERALL,
        filters: [],
        query: { language: 'kuery', query: '' },
      });
      jest.advanceTimersByTime(501);
      await waitForNextUpdate();
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(2);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(2);

    await act(async () => {
      embeddableInput.next({
        id: 'test-swimlane-embeddable',
        jobIds: ['another-id'],
        swimlaneType: SWIMLANE_TYPE.OVERALL,
        filters: [],
        query: { language: 'kuery', query: '' },
      });
      jest.advanceTimersByTime(501);
      await waitForNextUpdate();
    });

    expect(services[2].anomalyDetectorService.getJobs$).toHaveBeenCalledTimes(2);
    expect(services[2].anomalyTimelineService.loadOverallData).toHaveBeenCalledTimes(3);
  });
});

describe('processFilters', () => {
  test('should format embeddable input to es query', () => {
    expect(
      processFilters(
        [
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              type: 'phrases',
              key: 'instance',
              value: 'i-20d061fa',
              params: ['i-20d061fa'],
              alias: null,
              negate: false,
              disabled: false,
            },
            query: {
              bool: {
                should: [
                  {
                    match_phrase: {
                      instance: 'i-20d061fa',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: true,
              disabled: false,
              type: 'phrase',
              key: 'instance',
              params: {
                query: 'i-16fd8d2a',
              },
            },
            query: {
              match_phrase: {
                instance: 'i-16fd8d2a',
              },
            },

            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: false,
              disabled: false,
              type: 'exists',
              key: 'instance',
              value: 'exists',
            },
            exists: {
              field: 'instance',
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
          {
            meta: {
              index: 'c01fcbd0-8936-11ea-a70f-9f68bc175114',
              alias: null,
              negate: false,
              disabled: true,
              type: 'exists',
              key: 'instance',
              value: 'exists',
            },
            exists: {
              field: 'region',
            },
            $state: {
              // @ts-ignore
              store: 'appState',
            },
          },
        ],
        {
          language: 'kuery',
          query: 'instance : "i-088147ac"',
        }
      )
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    instance: 'i-088147ac',
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [
                {
                  match_phrase: {
                    instance: 'i-20d061fa',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            exists: {
              field: 'instance',
            },
          },
        ],
        must_not: [
          {
            match_phrase: {
              instance: 'i-16fd8d2a',
            },
          },
        ],
      },
    });
  });
});
