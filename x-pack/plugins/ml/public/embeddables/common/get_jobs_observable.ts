/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import { Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, pluck, switchMap } from 'rxjs/operators';
import { parseInterval } from '../../../common/util/parse_interval';
import type { ExplorerJob } from '../../application/explorer/explorer_utils';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import type { AnomalyChartsEmbeddableInput, AnomalySwimlaneEmbeddableInput } from '../types';

export function getJobsObservable(
  embeddableInput: Observable<AnomalyChartsEmbeddableInput | AnomalySwimlaneEmbeddableInput>,
  anomalyDetectorService: AnomalyDetectorService,
  setErrorHandler: (e: Error) => void
) {
  return embeddableInput.pipe(
    pluck('jobIds'),
    distinctUntilChanged(isEqual),
    switchMap((jobsIds) => anomalyDetectorService.getJobs$(jobsIds)),
    map((jobs) => {
      const explorerJobs: ExplorerJob[] = jobs.map((job) => {
        const bucketSpan = parseInterval(job.analysis_config.bucket_span);
        return {
          id: job.job_id,
          selected: true,
          bucketSpanSeconds: bucketSpan!.asSeconds(),
        };
      });
      return explorerJobs;
    }),
    catchError((e) => {
      setErrorHandler(e.body ?? e);
      return of(undefined);
    })
  );
}
