/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFakeTimers, SinonFakeTimers } from 'sinon';
import { CalculatePayload, modelMemoryEstimatorProvider } from './model_memory_estimator';
import { JobValidator } from '../../job_validator';
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

  test('should not emit any value on subscription initialization', () => {
    const spy = jest.fn();
    modelMemoryEstimator.updates$.subscribe(spy);
    expect(spy).not.toHaveBeenCalled();
  });

  test('should not call the endpoint on the first provided config', () => {
    // arrange
    const spy = jest.fn();
    modelMemoryEstimator.updates$.subscribe(spy);
    // act
    modelMemoryEstimator.update({ analysisConfig: { detectors: [{}] } } as CalculatePayload);
    clock.tick(601);
    // assert
    expect(spy).not.toHaveBeenCalled();
  });

  test('should debounce it for 600 ms', () => {
    // arrange
    const spy = jest.fn();
    modelMemoryEstimator.updates$.subscribe(spy);
    // act
    modelMemoryEstimator.update({ analysisConfig: { detectors: [{}] } } as CalculatePayload);
    clock.tick(601);
    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ function: 'mean' }] },
    } as CalculatePayload);
    clock.tick(601);
    // assert
    expect(spy).toHaveBeenCalledWith('15MB');
  });

  test('should not proceed further if the payload has not been changed', () => {
    const spy = jest.fn();
    modelMemoryEstimator.updates$.subscribe(spy);

    // ignored payload
    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ by_field_name: '' }] },
    } as CalculatePayload);
    clock.tick(601);

    // first emitted
    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);
    clock.tick(601);

    // second emitted with the same configuration
    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ by_field_name: 'test' }] },
    } as CalculatePayload);
    clock.tick(601);

    expect(ml.calculateModelMemoryLimit$).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('should call the endpoint only with a valid and not initially provided configuration', () => {
    const spy = jest.fn();

    modelMemoryEstimator.updates$.subscribe(spy);

    // ignored payload
    modelMemoryEstimator.update({
      analysisConfig: { detectors: [{ by_field_name: '' }] },
    } as CalculatePayload);
    clock.tick(601);

    modelMemoryEstimator.update(({
      analysisConfig: { detectors: [] },
    } as unknown) as CalculatePayload);
    // @ts-ignore
    mockJobValidator.isModelMemoryEstimationPayloadValid = false;
    clock.tick(601);

    expect(ml.calculateModelMemoryLimit$).not.toHaveBeenCalled();
  });
});
