/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Observable } from 'rxjs';
import { catchError, distinctUntilChanged, EMPTY, map, switchMap } from 'rxjs';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import { parseInterval } from '../../../common/util/parse_interval';
import type { ExplorerJob } from '../../application/explorer/explorer_utils';
import type { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';

export function getJobsObservable(
  jobIds$: Observable<JobId[]>,
  anomalyDetectorService: AnomalyDetectorService,
  setErrorHandler: (e: Error) => void
): Observable<ExplorerJob[]> {
  return jobIds$.pipe(
    distinctUntilChanged(isEqual),
    switchMap((jobsIds) => {
      return anomalyDetectorService.getJobs$(jobsIds).pipe(
        catchError((e) => {
          // Catch error to prevent the observable from completing
          setErrorHandler(e.body ?? e);
          return EMPTY;
        })
      );
    }),
    map((jobs) => {
      const explorerJobs: ExplorerJob[] = jobs.map((job) => {
        const bucketSpan = parseInterval(job.analysis_config.bucket_span!);
        return {
          id: job.job_id,
          selected: true,
          bucketSpanSeconds: bucketSpan!.asSeconds(),
          modelPlotEnabled: job.model_plot_config?.enabled === true,
        };
      });
      return explorerJobs;
    })
  );
}
