/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiFlexItem, EuiSpacer, EuiCallOut, EuiSelect, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';

import { RandomSamplerRangeSlider } from './random_sampler_range_slider';
import type { RandomSampler, RandomSamplerOption } from './random_sampler';
import { randomSamplerText } from './random_sampler';
import { RANDOM_SAMPLER_OPTION, RANDOM_SAMPLER_SELECT_OPTIONS } from './random_sampler';

interface Props {
  randomSampler: RandomSampler;
  reload: () => void;
}

export const SamplingPanel: FC<Props> = ({ randomSampler, reload }) => {
  const samplingProbability = useObservable(
    randomSampler.getProbability$(),
    randomSampler.getProbability()
  );
  const setSamplingProbability = useCallback(
    (probability: number | null) => {
      randomSampler.setProbability(probability);
      reload();
    },
    [reload, randomSampler]
  );

  const randomSamplerPreference = useObservable(randomSampler.getMode$(), randomSampler.getMode());
  const setRandomSamplerPreference = useCallback(
    (mode: RandomSamplerOption) => {
      randomSampler.setMode(mode);
      reload();
    },
    [randomSampler, reload]
  );

  const { calloutInfoMessage } = useMemo(
    () => randomSamplerText(randomSamplerPreference),
    [randomSamplerPreference]
  );

  return (
    <>
      <EuiFlexItem grow={true}>
        <EuiCallOut size="s" color={'primary'} title={calloutInfoMessage} />
      </EuiFlexItem>
      <EuiSpacer size="m" />

      <EuiFormRow
        data-test-subj="aiopsRandomSamplerOptionsFormRow"
        label={i18n.translate(
          'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.randomSamplerRowLabel',
          {
            defaultMessage: 'Random sampling',
          }
        )}
      >
        <EuiSelect
          data-test-subj="aiopsRandomSamplerOptionsSelect"
          options={RANDOM_SAMPLER_SELECT_OPTIONS}
          value={randomSamplerPreference}
          onChange={(e) => setRandomSamplerPreference(e.target.value as RandomSamplerOption)}
        />
      </EuiFormRow>

      {randomSamplerPreference === RANDOM_SAMPLER_OPTION.ON_MANUAL ? (
        <RandomSamplerRangeSlider
          samplingProbability={samplingProbability}
          setSamplingProbability={setSamplingProbability}
        />
      ) : null}

      {randomSamplerPreference === RANDOM_SAMPLER_OPTION.ON_AUTOMATIC ? (
        <ProbabilityUsedMessage samplingProbability={samplingProbability} />
      ) : null}
    </>
  );
};

const ProbabilityUsedMessage: FC<{ samplingProbability: number | null }> = ({
  samplingProbability,
}) => {
  return samplingProbability !== null ? (
    <div data-test-subj="aiopsRandomSamplerProbabilityUsedMsg">
      <EuiSpacer size="m" />

      <FormattedMessage
        id="xpack.aiops.logCategorization.randomSamplerSettingsPopUp.probabilityLabel"
        defaultMessage="Probability used: {samplingProbability}%"
        values={{ samplingProbability: samplingProbability * 100 }}
      />
    </div>
  ) : null;
};
