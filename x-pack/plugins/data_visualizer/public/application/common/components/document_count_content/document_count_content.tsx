/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  EuiButtonIcon,
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isDefined } from '@kbn/ml-is-defined';
import type { DocumentCountChartPoint } from './document_count_chart';
import {
  RandomSamplerOption,
  RANDOM_SAMPLER_SELECT_OPTIONS,
  RANDOM_SAMPLER_OPTION,
} from '../../../index_data_visualizer/constants/random_sampler';
import { TotalCountHeader } from './total_count_header';
import type { DocumentCountStats } from '../../../../../common/types/field_stats';
import { DocumentCountChart } from './document_count_chart';
import { RandomSamplerRangeSlider } from './random_sampler_range_slider';

export interface Props {
  documentCountStats?: DocumentCountStats;
  totalCount: number;
  samplingProbability?: number | null;
  setSamplingProbability?: (value: number | null) => void;
  randomSamplerPreference?: RandomSamplerOption;
  setRandomSamplerPreference: (value: RandomSamplerOption) => void;
  loading: boolean;
}

const ProbabilityUsedMessage = ({ samplingProbability }: Pick<Props, 'samplingProbability'>) => {
  return isDefined(samplingProbability) ? (
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

const CalculatingProbabilityMessage = (
  <div data-test-subj="dvRandomSamplerCalculatingProbabilityMsg">
    <EuiSpacer size="m" />

    <FormattedMessage
      id="xpack.dataVisualizer.randomSamplerSettingsPopUp.calculatingProbabilityLabel"
      defaultMessage="Calculating the optimal probability"
    />
  </div>
);

export const DocumentCountContent: FC<Props> = ({
  documentCountStats,
  totalCount,
  samplingProbability,
  setSamplingProbability,
  loading,
  randomSamplerPreference,
  setRandomSamplerPreference,
}) => {
  const [showSamplingOptionsPopover, setShowSamplingOptionsPopover] = useState(false);

  const onShowSamplingOptions = useCallback(() => {
    setShowSamplingOptionsPopover(!showSamplingOptionsPopover);
  }, [showSamplingOptionsPopover]);

  const closeSamplingOptions = useCallback(() => {
    setShowSamplingOptionsPopover(false);
  }, [setShowSamplingOptionsPopover]);

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

  if (documentCountStats === undefined) {
    return totalCount !== undefined ? <TotalCountHeader totalCount={totalCount} /> : null;
  }

  const { timeRangeEarliest, timeRangeLatest } = documentCountStats;
  if (timeRangeEarliest === undefined || timeRangeLatest === undefined)
    return <TotalCountHeader totalCount={totalCount} />;

  let chartPoints: DocumentCountChartPoint[] = [];
  if (documentCountStats.buckets !== undefined) {
    const buckets: Record<string, number> = documentCountStats?.buckets;
    chartPoints = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  const approximate = documentCountStats.randomlySampled === true;

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <TotalCountHeader totalCount={totalCount} approximate={approximate} loading={loading} />
        <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
          <EuiPopover
            data-test-subj="dvRandomSamplerOptionsPopover"
            id="dataVisualizerSamplingOptions"
            button={
              <EuiToolTip
                content={i18n.translate('xpack.dataVisualizer.samplingOptionsButton', {
                  defaultMessage: 'Sampling options',
                })}
              >
                <EuiButtonIcon
                  size="xs"
                  iconType="gear"
                  onClick={onShowSamplingOptions}
                  data-test-subj="dvRandomSamplerOptionsButton"
                  aria-label={i18n.translate('xpack.dataVisualizer.samplingOptionsButton', {
                    defaultMessage: 'Sampling options',
                  })}
                />
              </EuiToolTip>
            }
            isOpen={showSamplingOptionsPopover}
            closePopover={closeSamplingOptions}
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
                  onChange={(e) =>
                    setRandomSamplerPreference(e.target.value as RandomSamplerOption)
                  }
                />
              </EuiFormRow>

              {randomSamplerPreference === RANDOM_SAMPLER_OPTION.ON_MANUAL ? (
                <RandomSamplerRangeSlider
                  samplingProbability={samplingProbability}
                  setSamplingProbability={setSamplingProbability}
                />
              ) : null}

              {randomSamplerPreference === RANDOM_SAMPLER_OPTION.ON_AUTOMATIC ? (
                loading ? (
                  CalculatingProbabilityMessage
                ) : (
                  <ProbabilityUsedMessage samplingProbability={samplingProbability} />
                )
              ) : null}
            </EuiPanel>
          </EuiPopover>
          <EuiFlexItem />
        </EuiFlexItem>
      </EuiFlexGroup>
      <DocumentCountChart
        chartPoints={chartPoints}
        timeRangeEarliest={timeRangeEarliest}
        timeRangeLatest={timeRangeLatest}
        interval={documentCountStats.interval}
        loading={loading}
      />
    </>
  );
};
