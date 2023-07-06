/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import {
  EuiFlexItem,
  EuiPopover,
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
  EuiSelect,
  EuiFormRow,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';

import { RandomSamplerRangeSlider } from './random_sampler_range_slider';
import {
  RandomSampler,
  RandomSamplerOption,
  RANDOM_SAMPLER_OPTION,
  RANDOM_SAMPLER_SELECT_OPTIONS,
} from './random_sampler';

interface Props {
  randomSampler: RandomSampler;
  reload: () => void;
}

export const SamplingMenu: FC<Props> = ({ randomSampler, reload }) => {
  const [showSamplingOptionsPopover, setShowSamplingOptionsPopover] = useState(false);

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

  const { calloutInfoMessage, buttonText } = useMemo(() => {
    switch (randomSamplerPreference) {
      case RANDOM_SAMPLER_OPTION.OFF:
        return {
          calloutInfoMessage: i18n.translate(
            'xpack.aiops.logCategorization.randomSamplerSettingsPopUp.offCallout.message',
            {
              defaultMessage:
                'Random sampling can be turned on to increase the speed of analysis, although some accuracy will be lost.',
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
  }, [randomSamplerPreference]);

  return (
    <EuiPopover
      data-test-subj="aiopsRandomSamplerOptionsPopover"
      id="aiopsSamplingOptions"
      button={
        <EuiButtonEmpty
          onClick={() => setShowSamplingOptionsPopover(!showSamplingOptionsPopover)}
          iconSide="right"
          iconType="arrowDown"
        >
          {buttonText}
        </EuiButtonEmpty>
      }
      isOpen={showSamplingOptionsPopover}
      closePopover={() => setShowSamplingOptionsPopover(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiPanel style={{ maxWidth: 400 }}>
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
      </EuiPanel>
    </EuiPopover>
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
