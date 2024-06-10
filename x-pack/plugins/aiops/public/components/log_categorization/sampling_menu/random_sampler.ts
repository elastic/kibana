/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { i18n } from '@kbn/i18n';

export const RANDOM_SAMPLER_PROBABILITIES = [
  0.00001, 0.00005, 0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5,
].map((n) => n * 100);

export const MIN_SAMPLER_PROBABILITY = 0.00001;
export const RANDOM_SAMPLER_STEP = MIN_SAMPLER_PROBABILITY * 100;
export const DEFAULT_PROBABILITY = 0.001;

export const RANDOM_SAMPLER_OPTION = {
  ON_AUTOMATIC: 'on_automatic',
  ON_MANUAL: 'on_manual',
  OFF: 'off',
} as const;

export type RandomSamplerOption = typeof RANDOM_SAMPLER_OPTION[keyof typeof RANDOM_SAMPLER_OPTION];
export type RandomSamplerProbability = number | null;

export const RANDOM_SAMPLER_SELECT_OPTIONS: Array<{
  value: RandomSamplerOption;
  inputDisplay: string;
  'data-test-subj': string;
}> = [
  {
    'data-test-subj': 'aiopsRandomSamplerOptionOnAutomatic',
    value: RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
    inputDisplay: i18n.translate(
      'xpack.aiops.logCategorization.randomSamplerPreference.onAutomaticLabel',
      {
        defaultMessage: 'On - automatic',
      }
    ),
  },
  {
    'data-test-subj': 'aiopsRandomSamplerOptionOnManual',
    value: RANDOM_SAMPLER_OPTION.ON_MANUAL,
    inputDisplay: i18n.translate(
      'xpack.aiops.logCategorization.randomSamplerPreference.onManualLabel',
      {
        defaultMessage: 'On - manual',
      }
    ),
  },
  {
    'data-test-subj': 'aiopsRandomSamplerOptionOff',
    value: RANDOM_SAMPLER_OPTION.OFF,
    inputDisplay: i18n.translate('xpack.aiops.logCategorization.randomSamplerPreference.offLabel', {
      defaultMessage: 'Off',
    }),
  },
];

export class RandomSampler {
  private docCount$ = new BehaviorSubject<number>(0);
  private mode$ = new BehaviorSubject<RandomSamplerOption>(RANDOM_SAMPLER_OPTION.ON_AUTOMATIC);
  private probability$ = new BehaviorSubject<RandomSamplerProbability>(DEFAULT_PROBABILITY);
  private setRandomSamplerModeInStorage: (mode: RandomSamplerOption) => void;
  private setRandomSamplerProbabilityInStorage: (prob: RandomSamplerProbability) => void;

  constructor(
    randomSamplerMode: RandomSamplerOption,
    setRandomSamplerMode: (mode: RandomSamplerOption) => void,
    randomSamplerProbability: RandomSamplerProbability,
    setRandomSamplerProbability: (prob: RandomSamplerProbability) => void
  ) {
    this.mode$.next(randomSamplerMode);
    this.setRandomSamplerModeInStorage = setRandomSamplerMode;
    this.probability$.next(randomSamplerProbability);
    this.setRandomSamplerProbabilityInStorage = setRandomSamplerProbability;
  }

  setDocCount(docCount: number) {
    return this.docCount$.next(docCount);
  }

  getDocCount() {
    return this.docCount$.getValue();
  }

  public setMode(mode: RandomSamplerOption) {
    this.setRandomSamplerModeInStorage(mode);
    return this.mode$.next(mode);
  }

  public getMode$() {
    return this.mode$.asObservable();
  }

  public getMode() {
    return this.mode$.getValue();
  }

  public setProbability(probability: RandomSamplerProbability) {
    this.setRandomSamplerProbabilityInStorage(probability);
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

export const randomSamplerText = (randomSamplerPreference: RandomSamplerOption) => {
  switch (randomSamplerPreference) {
    case RANDOM_SAMPLER_OPTION.OFF:
      return {
        calloutInfoMessage: i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.offCallout.message',
          {
            defaultMessage:
              'Random sampling can be turned on to increase analysis speed. Accuracy will slightly decrease.',
          }
        ),
        buttonText: i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.offCallout.button',
          {
            defaultMessage: 'No sampling',
          }
        ),
      };
    case RANDOM_SAMPLER_OPTION.ON_AUTOMATIC:
      return {
        calloutInfoMessage: i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.onAutomaticCallout.message',
          {
            defaultMessage:
              'The pattern analysis will use random sampler aggregations. The probability is automatically set to balance accuracy and speed.',
          }
        ),
        buttonText: i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.onAutomaticCallout.button',
          {
            defaultMessage: 'Auto sampling',
          }
        ),
      };

    case RANDOM_SAMPLER_OPTION.ON_MANUAL:
    default:
      return {
        calloutInfoMessage: i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.onManualCallout.message',
          {
            defaultMessage:
              'The pattern analysis will use random sampler aggregations. A lower percentage probability increases performance, but some accuracy is lost.',
          }
        ),
        buttonText: i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.onManualCallout.button',
          {
            defaultMessage: 'Manual sampling',
          }
        ),
      };
  }
};
