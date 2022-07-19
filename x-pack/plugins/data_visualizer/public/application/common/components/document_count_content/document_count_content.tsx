/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { sortedIndex } from 'lodash';
import type { DocumentCountChartPoint } from './document_count_chart';
import {
  RANDOM_SAMPLER_STEP,
  RANDOM_SAMPLER_PROBABILITIES,
} from '../../../index_data_visualizer/constants/random_sampler';
import { TotalCountHeader } from './total_count_header';
import type { DocumentCountStats } from '../../../../../common/types/field_stats';
import { DocumentCountChart } from './document_count_chart';

export interface Props {
  documentCountStats?: DocumentCountStats;
  totalCount: number;
  samplingProbability?: number | null;
  setSamplingProbability?: (value: number) => void;
  loading: boolean;
}

export const DocumentCountContent: FC<Props> = ({
  documentCountStats,
  totalCount,
  samplingProbability,
  setSamplingProbability,
  loading,
}) => {
  const [showSamplingOptionsPopover, setShowSamplingOptionsPopover] = useState(false);

  const onShowSamplingOptions = useCallback(() => {
    setShowSamplingOptionsPopover(!showSamplingOptionsPopover);
  }, [showSamplingOptionsPopover]);

  const closeSamplingOptions = useCallback(() => {
    setShowSamplingOptionsPopover(false);
  }, [setShowSamplingOptionsPopover]);

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
        <TotalCountHeader totalCount={totalCount} approximate={approximate} />
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="dscSamplingOptions"
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
                  data-test-subj="discoverSamplingOptionsToggle"
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
                <EuiCallOut
                  iconType="help"
                  size="s"
                  color={'primary'}
                  title={i18n.translate('xpack.dataVisualizer.randomSamplerInfoCalloutMessage', {
                    defaultMessage:
                      'Random sampler is being used for the total document count and the chart. Pick a higher percentage for better accuracy, or 100% for exact values without any sampling.',
                  })}
                />
              </EuiFlexItem>
              <EuiSpacer size="m" />
              <EuiFlexItem grow={true}>
                <EuiRange
                  fullWidth
                  showValue
                  showTicks
                  showRange={false}
                  min={RANDOM_SAMPLER_STEP}
                  max={1 * 100}
                  value={(samplingProbability ?? 1) * 100}
                  ticks={RANDOM_SAMPLER_PROBABILITIES.map((d) => ({
                    value: d,
                    label: d === 0.001 || d >= 10 ? `${d}%` : '',
                  }))}
                  onChange={(e) => {
                    const newProbability = Number(e.currentTarget.value);
                    const idx = sortedIndex(RANDOM_SAMPLER_PROBABILITIES, newProbability);
                    const closestPrev = RANDOM_SAMPLER_PROBABILITIES[idx - 1];
                    const closestNext = RANDOM_SAMPLER_PROBABILITIES[idx];
                    const closestProbability =
                      Math.abs(closestPrev - newProbability) <
                      Math.abs(closestNext - newProbability)
                        ? closestPrev
                        : closestNext;

                    if (setSamplingProbability) {
                      setSamplingProbability(closestProbability / 100);
                    }
                  }}
                  step={RANDOM_SAMPLER_STEP}
                />
              </EuiFlexItem>
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
