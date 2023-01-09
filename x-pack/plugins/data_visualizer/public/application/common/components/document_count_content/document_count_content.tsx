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
  EuiRange,
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce, sortedIndex } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { isDefined } from '@kbn/ml-is-defined';
import type { DocumentCountChartPoint } from './document_count_chart';
import {
  RANDOM_SAMPLER_STEP,
  RANDOM_SAMPLER_PROBABILITIES,
  RandomSamplerOption,
  RANDOM_SAMPLER_SELECT_OPTIONS,
  RANDOM_SAMPLER_OPTION,
} from '../../../index_data_visualizer/constants/random_sampler';
import { TotalCountHeader } from './total_count_header';
import type { DocumentCountStats } from '../../../../../common/types/field_stats';
import { DocumentCountChart } from './document_count_chart';

export interface Props {
  documentCountStats?: DocumentCountStats;
  totalCount: number;
  samplingProbability?: number | null;
  setSamplingProbability?: (value: number) => void;
  randomSamplerPreference?: RandomSamplerOption;
  setRandomSamplerPreference: (value: RandomSamplerOption) => void;
  loading: boolean;
}

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateSamplingProbability = useCallback(
    debounce((newProbability: number) => {
      if (setSamplingProbability) {
        const idx = sortedIndex(RANDOM_SAMPLER_PROBABILITIES, newProbability);
        const closestPrev = RANDOM_SAMPLER_PROBABILITIES[idx - 1];
        const closestNext = RANDOM_SAMPLER_PROBABILITIES[idx];
        const closestProbability =
          Math.abs(closestPrev - newProbability) < Math.abs(closestNext - newProbability)
            ? closestPrev
            : closestNext;

        setSamplingProbability(closestProbability / 100);
      }
    }, 100),
    [setSamplingProbability]
  );

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

  const ProbabilityUsed =
    randomSamplerPreference !== RANDOM_SAMPLER_OPTION.OFF && isDefined(samplingProbability) ? (
      <div data-test-subj="dvRandomSamplerAutomaticProbabilityMsg">
        <EuiSpacer size="m" />

        <FormattedMessage
          id="xpack.dataVisualizer.randomSamplerSettingsPopUp.probabilityLabel"
          defaultMessage="Probability used: {samplingProbability}%"
          values={{ samplingProbability: samplingProbability * 100 }}
        />
      </div>
    ) : null;

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
                <EuiFlexItem grow={true}>
                  <EuiSpacer size="m" />
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.dataVisualizer.randomSamplerSettingsPopUp.randomSamplerPercentageRowLabel',
                      {
                        defaultMessage: 'Sampling percentage',
                      }
                    )}
                  >
                    <EuiRange
                      fullWidth
                      showValue
                      showTicks
                      showRange={false}
                      min={RANDOM_SAMPLER_STEP}
                      max={0.5 * 100}
                      value={(samplingProbability ?? 1) * 100}
                      ticks={RANDOM_SAMPLER_PROBABILITIES.map((d) => ({
                        value: d,
                        label: d === 0.001 || d >= 5 ? `${d}%` : '',
                      }))}
                      onChange={(e) => updateSamplingProbability(Number(e.currentTarget.value))}
                      step={RANDOM_SAMPLER_STEP}
                      data-test-subj="dvRandomSamplerProbabilityRange"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              ) : (
                ProbabilityUsed
              )}
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
