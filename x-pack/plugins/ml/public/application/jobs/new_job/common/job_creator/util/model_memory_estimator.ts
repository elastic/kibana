/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, of, Subject } from 'rxjs';
import {
  catchError,
  debounceTime,
  pluck,
  startWith,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../../../../../common/constants/new_job';
import { ml } from '../../../../../services/ml_api_service';
import { JobValidationResult, VALIDATION_DELAY_MS } from '../../job_validator/job_validator';

export type CalculatePayload = Parameters<typeof ml.calculateModelMemoryLimit$>[0];

export const modelMemoryEstimatorProvider = (
  modelMemoryCheck$: Observable<CalculatePayload>,
  validationResults$: Observable<JobValidationResult>
) => {
  const error$ = new Subject<Error>();

  return {
    get error$(): Observable<Error> {
      return error$.asObservable();
    },
    get updates$(): Observable<string> {
      return modelMemoryCheck$.pipe(
        debounceTime(VALIDATION_DELAY_MS + 100),
        withLatestFrom(validationResults$),
        switchMap(([payload, validationResults]) => {
          const isPayloadValid =
            payload.analysisConfig.detectors.length > 0 && validationResults.bucketSpan.valid;

          return isPayloadValid
            ? ml.calculateModelMemoryLimit$(payload).pipe(
                pluck('modelMemoryLimit'),
                catchError(error => {
                  // eslint-disable-next-line no-console
                  console.error('Model memory limit could not be calculated', error);
                  error$.next(error);
                  return of(DEFAULT_MODEL_MEMORY_LIMIT);
                })
              )
            : of(DEFAULT_MODEL_MEMORY_LIMIT);
        }),
        startWith(DEFAULT_MODEL_MEMORY_LIMIT)
      );
    },
  };
};
