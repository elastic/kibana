/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RANDOM_SAMPLER_PROBABILITIES = [
  0.5, 0.25, 0.1, 0.05, 0.025, 0.01, 0.005, 0.0025, 0.001, 0.0005, 0.00025, 0.0001, 0.00005,
  0.00001,
]
  .reverse()
  .map((n) => n * 100);

export const RANDOM_SAMPLER_STEP = 0.00001 * 100;

export const RANDOM_SAMPLER_OPTION = {
  ON_AUTOMATIC: 'on_automatic',
  ON_MANUAL: 'on_manual',
  OFF: 'off',
} as const;

export type RandomSamplerOption = typeof RANDOM_SAMPLER_OPTION[keyof typeof RANDOM_SAMPLER_OPTION];

export const RANDOM_SAMPLER_SELECT_OPTIONS: Array<{
  value: RandomSamplerOption;
  text: string;
  'data-test-subj': string;
}> = [
  {
    'data-test-subj': 'dvRandomSamplerOptionOnAutomatic',
    value: RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
    text: i18n.translate('xpack.dataVisualizer.randomSamplerPreference.onAutomaticLabel', {
      defaultMessage: 'On - automatic',
    }),
  },
  {
    'data-test-subj': 'dvRandomSamplerOptionOnManual',
    value: RANDOM_SAMPLER_OPTION.ON_MANUAL,
    text: i18n.translate('xpack.dataVisualizer.randomSamplerPreference.onManualLabel', {
      defaultMessage: 'On - manual',
    }),
  },
  {
    'data-test-subj': 'dvRandomSamplerOptionOff',
    value: RANDOM_SAMPLER_OPTION.OFF,
    text: i18n.translate('xpack.dataVisualizer.randomSamplerPreference.offLabel', {
      defaultMessage: 'Off',
    }),
  },
];
