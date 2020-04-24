/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import { EuiResizeObserver, EuiSpacer } from '@elastic/eui';
import { combineLatest, from, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, skipWhile, startWith, switchMap } from 'rxjs/operators';
import { throttle } from 'lodash';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { ExplorerSwimlane } from '../../application/explorer/explorer_swimlane';
import { TimeBuckets } from '../../application/util/time_buckets';
import { ExplorerJob, OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import { MlStartDependencies } from '../../plugin';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  MlServices,
} from './anomaly_swimlane_embaddable';
import { parseInterval } from '../../../common/util/parse_interval';
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import { MlTooltipComponent } from '../../application/components/chart_tooltip';

const RESIZE_THROTTLE_TIME_MS = 200;

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
  onOutputChange,
}) => {
  const [{ uiSettings, notifications }, , { explorerService }] = services;

  const [swimlaneData, setSwimlaneData] = useState<OverallSwimlaneData>();
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [swimlaneType, setSwimlaneType] = useState<string>();

  const chartWidth$ = useMemo(() => new Subject<number>(), []);

  const timeBuckets = new TimeBuckets({
    'histogram:maxBars': uiSettings.get('histogram:maxBars'),
    'histogram:barTarget': uiSettings.get('histogram:barTarget'),
    dateFormat: uiSettings.get('dateFormat'),
    'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
  });

  useEffect(() => {
    chartWidth$.next(chartWidth);
  }, [chartWidth]);

  useEffect(() => {
    const subscription = combineLatest([
      embeddableInput,
      chartWidth$.pipe(skipWhile(v => !v)),
      refresh.pipe(startWith(null)),
    ])
      .pipe(
        debounceTime(500),
        switchMap(([input, swimlaneContainerWidth]) => {
          const { jobs, viewBy, swimlaneType: swimlaneTypeInput, timeRange } = input;

          explorerService.setTimeRange(timeRange);

          onOutputChange({ timeRange });

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
                    5,
                    swimlaneContainerWidth
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
        catchError(error => {
          notifications.toasts.addError(new Error(error), {
            title: i18n.translate('xpack.ml.swimlaneEmbeddable.errorMessage', {
              defaultMessage: 'Unable to load the swimlane data',
            }),
          });
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

  return (
    <EuiResizeObserver onResize={onResize}>
      {resizeRef => (
        <div
          style={{ width: '100%' }}
          data-test-subj={`mlMaxAnomalyScoreEmbeddable_${id}`}
          ref={el => {
            resizeRef(el);
          }}
        >
          {chartWidth > 0 && swimlaneData && swimlaneType && (
            <>
              <EuiSpacer size="m" />
              <MlTooltipComponent>
                <ExplorerSwimlane
                  chartWidth={chartWidth}
                  timeBuckets={timeBuckets}
                  swimlaneData={swimlaneData}
                  swimlaneType={swimlaneType}
                />
              </MlTooltipComponent>
            </>
          )}
        </div>
      )}
    </EuiResizeObserver>
  );
};
