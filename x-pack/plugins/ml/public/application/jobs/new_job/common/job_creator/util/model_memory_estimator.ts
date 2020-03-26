/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, of, Subject } from 'rxjs';
import { isEqual, cloneDeep } from 'lodash';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  pluck,
  startWith,
  switchMap,
  map,
} from 'rxjs/operators';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../../../../../common/constants/new_job';
import { ml } from '../../../../../services/ml_api_service';
import { JobValidator, VALIDATION_DELAY_MS } from '../../job_validator/job_validator';
import { ErrorResponse } from '../../../../../../../common/types/errors';

export type CalculatePayload = Parameters<typeof ml.calculateModelMemoryLimit$>[0];

export const modelMemoryEstimatorProvider = (
  modelMemoryCheck$: Observable<CalculatePayload>,
  jobValidator: JobValidator
) => {
  const error$ = new Subject<ErrorResponse['body']>();

  return {
    get error$(): Observable<ErrorResponse['body']> {
      return error$.asObservable();
    },
    get updates$(): Observable<string> {
      return modelMemoryCheck$.pipe(
        // delay the request, making sure the validation is completed
        debounceTime(VALIDATION_DELAY_MS + 100),
        // clone the object to compare payloads and proceed further only
        // if the configuration has been changed
        map(cloneDeep),
        distinctUntilChanged(isEqual),
        switchMap(payload => {
          const isPayloadValid = jobValidator.isModelMemoryEstimationPayloadValid;

          return isPayloadValid
            ? ml.calculateModelMemoryLimit$(payload).pipe(
                pluck('modelMemoryLimit'),
                catchError(error => {
                  // eslint-disable-next-line no-console
                  console.error('Model memory limit could not be calculated', error.body);
                  error$.next(error.body);
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
