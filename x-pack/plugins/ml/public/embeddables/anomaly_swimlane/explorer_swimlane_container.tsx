/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
import { combineLatest, forkJoin, from, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap } from 'rxjs/operators';
import { throttle } from 'lodash';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { ChartTooltip } from '../../application/components/chart_tooltip';
import { ExplorerSwimlane } from '../../application/explorer/explorer_swimlane';
import { TimeBuckets } from '../../application/util/time_buckets';
import {
  initGetSwimlaneBucketInterval,
  loadOverallData,
  OverallSwimlaneData,
} from '../../application/explorer/explorer_utils';
import { MlStartDependencies } from '../../plugin';
import { AnomalySwimlaneEmbeddableInput, MlServices } from './anomaly_swimlane_embaddable';
import { parseInterval } from '../../../common/util/parse_interval';

export interface ExplorerSwimlaneContainerProps {
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>;
  services: [CoreStart, MlStartDependencies, MlServices];
  refresh: Observable<any>;
}

export const ExplorerSwimlaneContainer: FC<ExplorerSwimlaneContainerProps> = ({
  embeddableInput,
  services,
  refresh,
}) => {
  const [{ uiSettings, notifications }, pluginStart, { mlAnomalyDetectorService }] = services;

  const [swimlaneData, setSwimlaneData] = useState<OverallSwimlaneData>();
  const [chartWidth, setChartWidth] = useState<number>(0);

  const chartWidth$ = useMemo(() => new Subject(), []);

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
    combineLatest([embeddableInput, chartWidth$, refresh.pipe(startWith(null))])
      .pipe(
        debounceTime(500),
        map(([input]) => input),
        // resolve jobs' bucket spans
        switchMap(input => {
          return forkJoin(
            input.jobIds.map(jobId => mlAnomalyDetectorService.getJobById$(jobId))
          ).pipe(
            map(response => {
              const jobs = response.map(job => {
                const bucketSpan = parseInterval(job.analysis_config.bucket_span);
                return {
                  id: job.job_id,
                  selected: true,
                  bucketSpanSeconds: bucketSpan!.asSeconds(),
                };
              });
              return { ...input, jobs };
            })
          );
        }),
        switchMap(input => {
          const { jobs } = input;
          const { timefilter } = pluginStart.data.query.timefilter;
          timefilter.enableTimeRangeSelector();

          const interval = initGetSwimlaneBucketInterval(
            () => timefilter,
            () => timeBuckets
          )(jobs, chartWidth);

          return from(loadOverallData(jobs, interval, timefilter.getBounds())).pipe(
            catchError(error => {
              notifications.toasts.addError(new Error(error), {
                title: i18n.translate('xpack.ml.swimlaneEmbeddable.errorMessage', {
                  defaultMessage: 'Unable to load the swimlane data',
                }),
              });
              return of(null);
            })
          );
        }),
        map(response => {
          return response?.overallSwimlaneData;
        })
      )
      .subscribe(data => {
        setSwimlaneData(data);
      });
  }, []);

  const onResize = throttle((e: { width: number; height: number }) => {
    setChartWidth(e.width - 200);
  }, 200);

  const swimlaneType = 'overall';

  return (
    <EuiResizeObserver onResize={onResize}>
      {resizeRef => (
        <div
          style={{ width: '100%' }}
          data-test-subj="mlMaxAnomalyScoreEmbeddable"
          ref={el => {
            resizeRef(el);
          }}
        >
          {chartWidth > 0 && swimlaneData && (
            <>
              <ChartTooltip />
              <ExplorerSwimlane
                chartWidth={chartWidth}
                timeBuckets={timeBuckets}
                swimlaneData={swimlaneData}
                swimlaneType={swimlaneType}
              />
            </>
          )}
        </div>
      )}
    </EuiResizeObserver>
  );
};
