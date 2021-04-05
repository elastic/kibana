/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, pluck, switchMap } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { AnomalyChartsEmbeddableInput, AnomalySwimlaneEmbeddableInput } from '../types';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';

export function getJobsObservable(
  embeddableInput: Observable<AnomalyChartsEmbeddableInput | AnomalySwimlaneEmbeddableInput>,
  anomalyDetectorService: AnomalyDetectorService,
  setErrorHandler: (e: Error) => void
) {
  return embeddableInput.pipe(
    pluck('jobIds'),
    distinctUntilChanged(isEqual),
    switchMap((jobsIds) => anomalyDetectorService.getJobs$(jobsIds)),
    catchError((e) => {
      setErrorHandler(e.body ?? e);
      return of(undefined);
    })
  );
}
