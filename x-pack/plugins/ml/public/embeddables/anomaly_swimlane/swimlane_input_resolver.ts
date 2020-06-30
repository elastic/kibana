/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';
import { combineLatest, from, Observable, of, Subject } from 'rxjs';
import { isEqual } from 'lodash';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  pluck,
  skipWhile,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { CoreStart } from 'kibana/public';
import { TimeBuckets } from '../../application/util/time_buckets';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneServices,
} from './anomaly_swimlane_embeddable';
import { MlStartDependencies } from '../../plugin';
import { SWIMLANE_TYPE, SwimlaneType } from '../../application/explorer/explorer_constants';
import { Filter } from '../../../../../../src/plugins/data/common/es_query/filters';
import { Query } from '../../../../../../src/plugins/data/common/query';
import { esKuery, UI_SETTINGS } from '../../../../../../src/plugins/data/public';
import { ExplorerJob, OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import { parseInterval } from '../../../common/util/parse_interval';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';

const RESIZE_IGNORED_DIFF_PX = 20;
const FETCH_RESULTS_DEBOUNCE_MS = 500;

function getJobsObservable(
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>,
  anomalyDetectorService: AnomalyDetectorService
) {
  return embeddableInput.pipe(
    pluck('jobIds'),
    distinctUntilChanged(isEqual),
    switchMap((jobsIds) => anomalyDetectorService.getJobs$(jobsIds))
  );
}

export function useSwimlaneInputResolver(
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>,
  refresh: Observable<any>,
  services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices],
  chartWidth: number
): [string | undefined, OverallSwimlaneData | undefined, TimeBuckets, Error | null | undefined] {
  const [{ uiSettings }, , { explorerService, anomalyDetectorService }] = services;

  const [swimlaneData, setSwimlaneData] = useState<OverallSwimlaneData>();
  const [swimlaneType, setSwimlaneType] = useState<SwimlaneType>();
  const [error, setError] = useState<Error | null>();

  const chartWidth$ = useMemo(() => new Subject<number>(), []);

  const timeBuckets = useMemo(() => {
    return new TimeBuckets({
      'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, []);

  useEffect(() => {
    const subscription = combineLatest([
      getJobsObservable(embeddableInput, anomalyDetectorService),
      embeddableInput,
      chartWidth$.pipe(
        skipWhile((v) => !v),
        distinctUntilChanged((prev, curr) => {
          // emit only if the width has been changed significantly
          return Math.abs(curr - prev) < RESIZE_IGNORED_DIFF_PX;
        })
      ),
      refresh.pipe(startWith(null)),
    ])
      .pipe(
        debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
        switchMap(([jobs, input, swimlaneContainerWidth]) => {
          const {
            viewBy,
            swimlaneType: swimlaneTypeInput,
            limit,
            timeRange,
            filters,
            query,
          } = input;

          explorerService.setTimeRange(timeRange);

          if (!swimlaneType) {
            setSwimlaneType(swimlaneTypeInput);
          }

          const explorerJobs: ExplorerJob[] = jobs.map((job) => {
            const bucketSpan = parseInterval(job.analysis_config.bucket_span);
            return {
              id: job.job_id,
              selected: true,
              bucketSpanSeconds: bucketSpan!.asSeconds(),
            };
          });

          let appliedFilters: any;
          try {
            appliedFilters = processFilters(filters, query);
          } catch (e) {
            // handle query syntax errors
            setError(e);
            return of(undefined);
          }

          return from(explorerService.loadOverallData(explorerJobs, swimlaneContainerWidth)).pipe(
            switchMap((overallSwimlaneData) => {
              const { earliest, latest } = overallSwimlaneData;

              if (overallSwimlaneData && swimlaneTypeInput === SWIMLANE_TYPE.VIEW_BY) {
                return from(
                  explorerService.loadViewBySwimlane(
                    [],
                    { earliest, latest },
                    explorerJobs,
                    viewBy!,
                    limit!,
                    swimlaneContainerWidth,
                    appliedFilters
                  )
                ).pipe(
                  map((viewBySwimlaneData) => {
                    return {
                      ...viewBySwimlaneData!,
                      earliest,
                      latest,
                    };
                  })
                );
              }
              return of(overallSwimlaneData);
            })
          );
        }),
        catchError((e) => {
          setError(e.body);
          return of(undefined);
        })
      )
      .subscribe((data) => {
        if (data !== undefined) {
          setError(null);
          setSwimlaneData(data);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    chartWidth$.next(chartWidth);
  }, [chartWidth]);

  return [swimlaneType, swimlaneData, timeBuckets, error];
}

export function processFilters(filters: Filter[], query: Query) {
  const inputQuery =
    query.language === 'kuery'
      ? esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query.query as string))
      : query.query;

  const must = [inputQuery];
  const mustNot = [];
  for (const filter of filters) {
    if (filter.meta.disabled) continue;

    const {
      meta: { negate, type, key: fieldName },
    } = filter;

    let filterQuery = filter.query;

    if (filterQuery === undefined && type === 'exists') {
      filterQuery = {
        exists: {
          field: fieldName,
        },
      };
    }

    if (negate) {
      mustNot.push(filterQuery);
    } else {
      must.push(filterQuery);
    }
  }
  return {
    bool: {
      must,
      must_not: mustNot,
    },
  };
}
