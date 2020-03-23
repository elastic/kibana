/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsStart } from 'kibana/public';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../../../../../common/constants/new_job';
import { ml } from '../../../../../services/ml_api_service';

type CalculatePayload = Parameters<typeof ml.calculateModelMemoryLimit$>[0];

export type ModelMemoryEstimator = ReturnType<typeof estimatorProvider>;

export const estimatorProvider = (notification: NotificationsStart) => {
  const modelMemoryCheck$ = new Subject<CalculatePayload>();

  return {
    updates$(): Observable<string> {
      return modelMemoryCheck$.pipe(
        debounceTime(500),
        switchMap(v => {
          return v.analysisConfig.detectors.length > 0
            ? of(v).pipe(
                switchMap(payload => {
                  return ml.calculateModelMemoryLimit$(payload);
                }),
                map(resp => {
                  return resp.modelMemoryLimit;
                })
              )
            : of(DEFAULT_MODEL_MEMORY_LIMIT);
        }),
        // no need to emit if the estimation has not been changed
        distinctUntilChanged(),
        catchError(error => {
          // eslint-disable-next-line no-console
          console.error('Model memory limit could not be calculated', error);

          notification.toasts.addError(error, {
            title: i18n.translate('xpack.ml.newJob.wizard.estimateModelMemoryError', {
              defaultMessage: 'Model memory limit could not be calculated',
            }),
          });

          return of(DEFAULT_MODEL_MEMORY_LIMIT);
        })
      );
    },
    runEstimation(payload: CalculatePayload) {
      modelMemoryCheck$.next(payload);
    },
  };
};
