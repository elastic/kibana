/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { RandomSamplerOption, RANDOM_SAMPLER_OPTION } from './random_sampler';

const DEFAULT_PROBABILITY = 0.001;

export class Sampling {
  private docCount$ = new BehaviorSubject<number>(0);
  private mode$ = new BehaviorSubject<RandomSamplerOption>(RANDOM_SAMPLER_OPTION.ON_AUTOMATIC);
  private probability$ = new BehaviorSubject<number | null>(DEFAULT_PROBABILITY);

  constructor() {}

  setDocCount(docCount: number) {
    return this.docCount$.next(docCount);
  }

  getDocCount() {
    return this.docCount$.getValue();
  }

  public setMode(mode: RandomSamplerOption) {
    return this.mode$.next(mode);
  }

  public getMode$() {
    return this.mode$.asObservable();
  }

  public getMode() {
    return this.mode$.getValue();
  }

  public setProbability(probability: number | null) {
    return this.probability$.next(probability);
  }

  public getProbability$() {
    return this.probability$.asObservable();
  }

  public getProbability() {
    return this.probability$.getValue();
  }

  public createRandomSamplerWrapper() {
    const mode = this.getMode();
    const probability = this.getProbability();

    let prob = {};
    if (mode === RANDOM_SAMPLER_OPTION.ON_MANUAL) {
      prob = { probability };
    } else if (mode === RANDOM_SAMPLER_OPTION.OFF) {
      prob = { probability: 1 };
    }

    const wrapper = createRandomSamplerWrapper({
      ...prob,
      totalNumDocs: this.getDocCount(),
    });
    this.setProbability(wrapper.probability);
    return wrapper;
  }
}
