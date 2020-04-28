/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiResizeObserver,
  EuiSpacer,
} from '@elastic/eui';
import { combineLatest, from, Observable, of, Subject } from 'rxjs';
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
import { throttle, isEqual } from 'lodash';
import { CoreStart } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { ExplorerSwimlane } from '../../application/explorer/explorer_swimlane';
import { TimeBuckets } from '../../application/util/time_buckets';
import { ExplorerJob, OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import { MlStartDependencies } from '../../plugin';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  MlServices,
} from './anomaly_swimlane_embeddable';
import { parseInterval } from '../../../common/util/parse_interval';
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import { MlTooltipComponent } from '../../application/components/chart_tooltip';
import { Filter } from '../../../../../../src/plugins/data/common/es_query/filters';
import { esKuery, Query } from '../../../../../../src/plugins/data/public';

const RESIZE_THROTTLE_TIME_MS = 500;

export interface ExplorerSwimlaneContainerProps {
  id: string;
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>;
  services: [CoreStart, MlStartDependencies, MlServices];
  refresh: Observable<any>;
  onOutputChange: (output: Partial<AnomalySwimlaneEmbeddableOutput>) => void;
}

export const ExplorerSwimlaneContainer: FC<ExplorerSwimlaneContainerProps> = ({
  id,
  embeddableInput,
  services,
  refresh,
}) => {
  const [{ uiSettings }, , { explorerService, mlAnomalyDetectorService }] = services;

  const [swimlaneData, setSwimlaneData] = useState<OverallSwimlaneData>();
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [swimlaneType, setSwimlaneType] = useState<string>();
  const [error, setError] = useState();

  const chartWidth$ = useMemo(() => new Subject<number>(), []);

  const timeBuckets = useMemo(() => {
    return new TimeBuckets({
      'histogram:maxBars': uiSettings.get('histogram:maxBars'),
      'histogram:barTarget': uiSettings.get('histogram:barTarget'),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, []);

  const jobs$ = useMemo(
    () =>
      embeddableInput.pipe(
        pluck('jobIds'),
        distinctUntilChanged(isEqual),
        switchMap(jobsIds => mlAnomalyDetectorService.getJobs$(jobsIds))
      ),
    []
  );

  useEffect(() => {
    chartWidth$.next(chartWidth);
  }, [chartWidth]);

  useEffect(() => {
    const subscription = combineLatest([
      jobs$,
      embeddableInput,
      chartWidth$.pipe(
        skipWhile(v => !v),
        distinctUntilChanged((prev, curr) => {
          // emit only if the width has been changed significantly
          const allowedDiff = 20;
          const diff = Math.abs(curr - prev);
          return diff < allowedDiff;
        })
      ),
      refresh.pipe(startWith(null)),
    ])
      .pipe(
        debounceTime(500),
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

          const explorerJobs: ExplorerJob[] = jobs.map(job => {
            const bucketSpan = parseInterval(job.analysis_config.bucket_span);
            return {
              id: job.job_id,
              selected: true,
              bucketSpanSeconds: bucketSpan!.asSeconds(),
            };
          });

          return from(explorerService.loadOverallData(explorerJobs, swimlaneContainerWidth)).pipe(
            switchMap(overallSwimlaneData => {
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
                    processFilters(filters, query)
                  )
                ).pipe(
                  map(viewBySwimlaneData => {
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
        catchError(e => {
          setError(e.body);
          return of(undefined);
        })
      )
      .subscribe(data => {
        setSwimlaneData(data);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const onResize = throttle((e: { width: number; height: number }) => {
    const labelWidth = 200;
    setChartWidth(e.width - labelWidth);
  }, RESIZE_THROTTLE_TIME_MS);

  if (error) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.errorMessage"
            defaultMessage="Unable to load the swimlane data"
          />
        }
        color="danger"
        iconType="alert"
        style={{ width: '100%' }}
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  return (
    <EuiResizeObserver onResize={onResize}>
      {resizeRef => (
        <div
          style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
          data-test-subj={`mlMaxAnomalyScoreEmbeddable_${id}`}
          ref={el => {
            resizeRef(el);
          }}
        >
          <div style={{ width: '100%' }}>
            <EuiSpacer size="m" />

            {chartWidth > 0 && swimlaneData && swimlaneType ? (
              <MlTooltipComponent>
                {tooltipService => (
                  <ExplorerSwimlane
                    chartWidth={chartWidth}
                    timeBuckets={timeBuckets}
                    swimlaneData={swimlaneData}
                    swimlaneType={swimlaneType}
                    tooltipService={tooltipService}
                  />
                )}
              </MlTooltipComponent>
            ) : (
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiLoadingChart size="xl" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
        </div>
      )}
    </EuiResizeObserver>
  );
};

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
