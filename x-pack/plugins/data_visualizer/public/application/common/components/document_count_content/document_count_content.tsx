/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiCodeBlock, EuiRange, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { sortedIndex } from 'lodash';
import {
  RANDOM_SAMPLER_PROBABILITIES,
  RANDOM_SAMPLER_STEP,
} from '../../../index_data_visualizer/constants/random_sampler';
import { DocumentCountChart, DocumentCountChartPoint } from './document_count_chart';
import { TotalCountHeader } from './total_count_header';
import { DocumentCountStats } from '../../../../../common/types/field_stats';
export interface Props {
  documentCountStats?: DocumentCountStats;
  totalCount: number;
  samplingProbability?: number;
  setSamplingProbability?: (value: number) => void;
}

export const DocumentCountContent: FC<Props> = ({
  documentCountStats,
  totalCount,
  samplingProbability,
  setSamplingProbability,
}) => {
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

  return (
    <>
      <EuiFlexGroup>
        <TotalCountHeader
          totalCount={totalCount}
          approximate={documentCountStats.randomlySampled === true}
        />
        <EuiFlexItem grow={true}>
          <EuiRange
            fullWidth
            min={RANDOM_SAMPLER_STEP}
            max={1}
            value={samplingProbability ?? 1}
            ticks={RANDOM_SAMPLER_PROBABILITIES.map((d) => ({
              value: d,
              label: d === 0.00001 || d === 0.05 || d >= 0.1 ? `${d * 100}%` : '',
            }))}
            onChange={(e) => {
              const newProbability = Number(e.currentTarget.value);
              const idx = sortedIndex(RANDOM_SAMPLER_PROBABILITIES, newProbability);
              const closestPrev = RANDOM_SAMPLER_PROBABILITIES[idx - 1];
              const closestNext = RANDOM_SAMPLER_PROBABILITIES[idx];
              const closestProbability =
                Math.abs(closestPrev - newProbability) < Math.abs(closestNext - newProbability)
                  ? closestPrev
                  : closestNext;

              if (setSamplingProbability) {
                setSamplingProbability(closestProbability);
              }
            }}
            showTicks
            showRange={false}
            step={RANDOM_SAMPLER_STEP}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <DocumentCountChart
        chartPoints={chartPoints}
        timeRangeEarliest={timeRangeEarliest}
        timeRangeLatest={timeRangeLatest}
        interval={documentCountStats.interval}
      />
      <EuiCodeBlock>{
        // @TODO: Remove when draft PR is ready
        `randomly sampled: ${documentCountStats.randomlySampled}\nprobability: ${documentCountStats.probability}\ntook: ${documentCountStats.took}`
      }</EuiCodeBlock>
    </>
  );
};
