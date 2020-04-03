/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFakeTimers, SinonFakeTimers } from 'sinon';
import { CalculatePayload, modelMemoryEstimatorProvider } from './model_memory_estimator';
import { JobValidator } from '../../job_validator';
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
  let mockJobValidator: JobValidator;

  beforeEach(() => {
    clock = useFakeTimers();
    mockJobValidator = {
      isModelMemoryEstimationPayloadValid: true,
    } as JobValidator;
    modelMemoryEstimator = modelMemoryEstimatorProvider(mockJobValidator);
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

    modelMemoryEstimator.update({ analysisConfig: { detectors: [{}] } } as CalculatePayload);

    clock.tick(601);
    expect(spy).toHaveBeenCalledWith('15MB');
  });

  test('should not proceed further if the payload has not been changed', () => {
    const spy = jest.fn();

    modelMemoryEstimator.updates$.subscribe(spy);

    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);

    clock.tick(601);

    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);

    clock.tick(601);

    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);

    clock.tick(601);

    expect(ml.calculateModelMemoryLimit$).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should call the endpoint only with a valid payload', () => {
    const spy = jest.fn();

    modelMemoryEstimator.updates$.subscribe(spy);

    modelMemoryEstimator.update(({
      analysisConfig: { detectors: [] },
    } as unknown) as CalculatePayload);
    // @ts-ignore
    mockJobValidator.isModelMemoryEstimationPayloadValid = false;

    clock.tick(601);

    expect(ml.calculateModelMemoryLimit$).not.toHaveBeenCalled();
  });
});
