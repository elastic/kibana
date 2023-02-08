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
import React, { useState } from 'react';
import {
  MIN_SAMPLER_PROBABILITY,
  RANDOM_SAMPLER_PROBABILITIES,
  RANDOM_SAMPLER_STEP,
} from '../../../index_data_visualizer/constants/random_sampler';

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
    samplingProbabilityInput <= 0 ||
    samplingProbabilityInput >= 50;

  return (
    <EuiFlexItem grow={true}>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.dataVisualizer.randomSamplerSettingsPopUp.randomSamplerPercentageRowLabel',
          {
            defaultMessage: 'Sampling percentage',
          }
        )}
        helpText={i18n.translate(
          'xpack.dataVisualizer.randomSamplerSettingsPopUp.randomSamplerPercentageRowHelpText',
          {
            defaultMessage: 'Choose a value between 0.001% and 50% to randomly sample data.',
          }
        )}
      >
        <>
          <EuiRange
            fullWidth
            showTicks
            showRange
            showInput="inputWithPopover"
            min={RANDOM_SAMPLER_STEP}
            max={50}
            value={(samplingProbabilityInput ?? MIN_SAMPLER_PROBABILITY) * 100}
            ticks={RANDOM_SAMPLER_PROBABILITIES.map((d) => ({
              value: d,
              label: d === 0.001 || d >= 5 ? `${d}` : '',
            }))}
            isInvalid={
              !isDefined(samplingProbabilityInput) ||
              isNaN(samplingProbabilityInput) ||
              samplingProbabilityInput <= 0 ||
              samplingProbabilityInput >= 50
            }
            onChange={(e) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              const prevValue = samplingProbabilityInput ? samplingProbabilityInput * 100 : value;

              if (value > 0 && value <= 1) {
                setSamplingProbabilityInput(value / 100);
              } else {
                setSamplingProbabilityInput(
                  Math.floor(Math.floor(value) + (value > prevValue ? 1 : 0)) / 100
                );
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
                  id="xpack.dataVisualizer.randomSamplerSettingsPopUp.randomSamplerPercentageApply"
                  defaultMessage="Apply"
                />
              </EuiButton>
            }
          />
        </>
      </EuiFormRow>
    </EuiFlexItem>
  );
};
