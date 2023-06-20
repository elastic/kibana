/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem, EuiFormRow, EuiRange, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import { FormattedMessage } from '@kbn/i18n-react';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import React, { useState } from 'react';
import {
  MIN_SAMPLER_PROBABILITY,
  RANDOM_SAMPLER_PROBABILITIES,
  RANDOM_SAMPLER_STEP,
} from './random_sampler';

export const RandomSamplerRangeSlider = ({
  samplingProbability,
  setSamplingProbability,
}: {
  samplingProbability?: number | null;
  setSamplingProbability?: (value: number | null) => void;
}) => {
  // Keep track of the input in sampling probability slider when mode is on - manual
  // before 'Apply' is clicked
  const [samplingProbabilityInput, setSamplingProbabilityInput] = useState(samplingProbability);

  const isInvalidSamplingProbabilityInput =
    !isDefined(samplingProbabilityInput) ||
    isNaN(samplingProbabilityInput) ||
    samplingProbabilityInput < MIN_SAMPLER_PROBABILITY ||
    samplingProbabilityInput > 0.5;

  const inputValue = (samplingProbabilityInput ?? MIN_SAMPLER_PROBABILITY) * 100;

  return (
    <EuiFlexItem grow={true}>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.randomSamplerPercentageRowLabel',
          {
            defaultMessage: 'Sampling percentage',
          }
        )}
        helpText={i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.randomSamplerPercentageRowHelpText',
          {
            defaultMessage: 'Choose a value between 0.001% and 50% to randomly sample data.',
          }
        )}
      >
        <EuiRange
          fullWidth
          showValue
          showRange
          showLabels
          showInput="inputWithPopover"
          min={RANDOM_SAMPLER_STEP}
          max={50}
          // Rounding to 0 decimal place because sometimes js results in weird number when multiplying fractions
          // e.g. 0.07 * 100 yields 7.000000000000001
          value={
            inputValue >= 1
              ? roundToDecimalPlace(inputValue, 0)
              : roundToDecimalPlace(inputValue, 3)
          }
          ticks={RANDOM_SAMPLER_PROBABILITIES.map((d) => ({
            value: d,
            label: d === 0.001 || d >= 5 ? `${d}` : '',
          }))}
          isInvalid={isInvalidSamplingProbabilityInput}
          onChange={(e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            const prevValue = samplingProbabilityInput ? samplingProbabilityInput * 100 : value;

            if (value > 0 && value <= 1) {
              setSamplingProbabilityInput(value / 100);
            } else {
              // Because the incremental step is very small (0.0001),
              // every time user clicks the ^/∨ in the numerical input
              // we need to make sure it rounds up or down to the next whole number
              const nearestInt = value > prevValue ? Math.ceil(value) : Math.floor(value);
              setSamplingProbabilityInput(nearestInt / 100);
            }
          }}
          step={RANDOM_SAMPLER_STEP}
          data-test-subj="dvRandomSamplerProbabilityRange"
          append={
            <EuiButton
              disabled={isInvalidSamplingProbabilityInput}
              onClick={() => {
                if (setSamplingProbability && isDefined(samplingProbabilityInput)) {
                  setSamplingProbability(samplingProbabilityInput);
                }
              }}
            >
              <FormattedMessage
                id="xpack.aiops.logCategorization.randomSamplerSettingsPopUp.randomSamplerPercentageApply"
                defaultMessage="Apply"
              />
            </EuiButton>
          }
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
