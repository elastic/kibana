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
  // EuiToolTip,
  // EuiButtonIcon,
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
import {
  RandomSamplerOption,
  RANDOM_SAMPLER_OPTION,
  RANDOM_SAMPLER_SELECT_OPTIONS,
} from './random_sampler';
import { RandomSamplerRangeSlider } from './random_sampler_range_slider';
import { Sampling } from './sampling';
// import { useSamplingMenu } from './use_sampling_menu';

interface Props {
  sampling: Sampling;
  reload: () => void;
  // samplingMenu: ReturnType<typeof useSamplingMenu>;
}

export const SamplingMenu: FC<Props> = ({ sampling, reload }) => {
  const [showSamplingOptionsPopover, setShowSamplingOptionsPopover] = useState(false);

  // const [samplingProbability, setSamplingProbability] = useState<number | null>(0.1);
  // const [randomSamplerPreference, setRandomSamplerPreference] = useState<RandomSamplerOption>(
  //   RANDOM_SAMPLER_OPTION.ON_AUTOMATIC
  // );

  const samplingProbability = useObservable(sampling.getProbability$(), sampling.getProbability());
  const setSamplingProbability = useCallback(
    (probability: number | null) => {
      sampling.setProbability(probability);
      reload();
    },
    [reload, sampling]
  );

  const randomSamplerPreference = useObservable(sampling.getMode$(), sampling.getMode());
  const setRandomSamplerPreference = useCallback(
    (mode: RandomSamplerOption) => {
      sampling.setMode(mode);
      reload();
    },
    [reload, sampling]
  );
  // const {
  //   setProbability,
  //   setMode,
  //   mode: randomSamplerPreference,
  //   probability: samplingProbability,
  // } = samplingMenu;
  // const setSamplingProbability = useCallback(
  //   (probability: number | null) => {
  //     if (probability !== null) {
  //       setProbability(probability);
  //     }
  //   },
  //   [setProbability]
  // );

  // const setRandomSamplerPreference = useCallback(
  //   (mode: RandomSamplerOption) => {
  //     setMode(mode);
  //   },
  //   [setMode]
  // );

  const buttonText = useMemo(() => {
    switch (randomSamplerPreference) {
      case RANDOM_SAMPLER_OPTION.OFF:
        return i18n.translate('xpack.dataVisualizer.randomSamplerSettingsPopUp.offCalloutMessage', {
          defaultMessage: 'No sampling',
        });
      case RANDOM_SAMPLER_OPTION.ON_AUTOMATIC:
        return i18n.translate(
          'xpack.dataVisualizer.randomSamplerSettingsPopUp.onAutomaticCalloutMessage',
          {
            defaultMessage: 'Auto sampling',
          }
        );

      case RANDOM_SAMPLER_OPTION.ON_MANUAL:
      default:
        return i18n.translate(
          'xpack.dataVisualizer.randomSamplerSettingsPopUp.onManualCalloutMessage',
          {
            defaultMessage: 'Manual sampling',
          }
        );
    }
  }, [randomSamplerPreference]);

  const calloutInfoMessage = useMemo(() => {
    switch (randomSamplerPreference) {
      case RANDOM_SAMPLER_OPTION.OFF:
        return i18n.translate('xpack.dataVisualizer.randomSamplerSettingsPopUp.offCalloutMessage', {
          defaultMessage:
            'Random sampling can be turned on for the total document count and chart to increase speed although some accuracy will be lost.',
        });
      case RANDOM_SAMPLER_OPTION.ON_AUTOMATIC:
        return i18n.translate(
          'xpack.dataVisualizer.randomSamplerSettingsPopUp.onAutomaticCalloutMessage',
          {
            defaultMessage:
              'The total document count and chart use random sampler aggregations. The probability is automatically set to balance accuracy and speed.',
          }
        );

      case RANDOM_SAMPLER_OPTION.ON_MANUAL:
      default:
        return i18n.translate(
          'xpack.dataVisualizer.randomSamplerSettingsPopUp.onManualCalloutMessage',
          {
            defaultMessage:
              'The total document count and chart use random sampler aggregations. A lower percentage probability increases performance, but some accuracy is lost.',
          }
        );
    }
  }, [randomSamplerPreference]);

  return (
    <EuiPopover
      data-test-subj="dvRandomSamplerOptionsPopover"
      id="dataVisualizerSamplingOptions"
      button={
        <EuiButtonEmpty
          onClick={() => setShowSamplingOptionsPopover(!showSamplingOptionsPopover)}
          iconSide="right"
          iconType="arrowDown"
        >
          {buttonText}
        </EuiButtonEmpty>

        // <EuiToolTip
        //   content={i18n.translate('xpack.dataVisualizer.samplingOptionsButton', {
        //     defaultMessage: 'Sampling options',
        //   })}
        // >
        //   <EuiButtonIcon
        //     size="xs"
        //     iconType="gear"
        //     onClick={() => setShowSamplingOptionsPopover(!showSamplingOptionsPopover)}
        //     data-test-subj="dvRandomSamplerOptionsButton"
        //     aria-label={i18n.translate('xpack.dataVisualizer.samplingOptionsButton', {
        //       defaultMessage: 'Sampling options',
        //     })}
        //   />
        // </EuiToolTip>
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
          data-test-subj="dvRandomSamplerOptionsFormRow"
          label={i18n.translate(
            'xpack.dataVisualizer.randomSamplerSettingsPopUp.randomSamplerRowLabel',
            {
              defaultMessage: 'Random sampling',
            }
          )}
        >
          <EuiSelect
            data-test-subj="dvRandomSamplerOptionsSelect"
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
    <div data-test-subj="dvRandomSamplerProbabilityUsedMsg">
      <EuiSpacer size="m" />

      <FormattedMessage
        id="xpack.dataVisualizer.randomSamplerSettingsPopUp.probabilityLabel"
        defaultMessage="Probability used: {samplingProbability}%"
        values={{ samplingProbability: samplingProbability * 100 }}
      />
    </div>
  ) : null;
};
