/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFakeTimers, SinonFakeTimers } from 'sinon';
import { CalculatePayload, modelMemoryEstimatorProvider } from './model_memory_estimator';
import { Subject } from 'rxjs';
import { JobValidationResult } from '../../job_validator/job_validator';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../../../../../common/constants/new_job';
import { ml } from '../../../../../services/ml_api_service';

jest.mock('../../../../../services/ml_api_service', () => {
  return {
    ml: {
      calculateModelMemoryLimit$: jest.fn(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { of } = require('rxjs');
        return of({ modelMemoryLimit: '15MB' });
      }),
    },
  };
});

describe('delay', () => {
  let clock: SinonFakeTimers;
  let modelMemoryEstimator: ReturnType<typeof modelMemoryEstimatorProvider>;
  let fakeModelMemoryCheck$: Subject<CalculatePayload>;
  let fakeValidationResults$: Subject<JobValidationResult>;

  beforeEach(() => {
    clock = useFakeTimers();
    fakeModelMemoryCheck$ = new Subject<CalculatePayload>();
    fakeValidationResults$ = new Subject<JobValidationResult>();
    modelMemoryEstimator = modelMemoryEstimatorProvider(
      fakeModelMemoryCheck$,
      fakeValidationResults$
    );
  });
  afterEach(() => {
    clock.restore();
    jest.clearAllMocks();
  });

  test('should emit a default value first', () => {
    const spy = jest.fn();
    modelMemoryEstimator.updates$.subscribe(spy);
    expect(spy).toHaveBeenCalledWith(DEFAULT_MODEL_MEMORY_LIMIT);
  });

  test('should debounce it for 600 ms', () => {
    const spy = jest.fn();

    modelMemoryEstimator.updates$.subscribe(spy);

    fakeModelMemoryCheck$.next({ analysisConfig: { detectors: [{}] } } as CalculatePayload);
    fakeValidationResults$.next({ bucketSpan: { valid: true } } as JobValidationResult);

    clock.tick(601);
    expect(spy).toHaveBeenCalledWith('15MB');
  });

  test('should not proceed further if the payload has not been changed', () => {
    const spy = jest.fn();

    modelMemoryEstimator.updates$.subscribe(spy);

    fakeModelMemoryCheck$.next({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);
    fakeValidationResults$.next({ bucketSpan: { valid: true } } as JobValidationResult);

    clock.tick(601);

    fakeModelMemoryCheck$.next({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);

    clock.tick(601);

    fakeModelMemoryCheck$.next({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);

    clock.tick(601);

    expect(ml.calculateModelMemoryLimit$).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should call the endpoint only with a valid payload', () => {
    const spy = jest.fn();

    modelMemoryEstimator.updates$.subscribe(spy);

    fakeModelMemoryCheck$.next(({
      analysisConfig: { detectors: [] },
    } as unknown) as CalculatePayload);
    fakeValidationResults$.next({ bucketSpan: { valid: false } } as JobValidationResult);

    clock.tick(601);

    expect(ml.calculateModelMemoryLimit$).not.toHaveBeenCalled();
  });
});
