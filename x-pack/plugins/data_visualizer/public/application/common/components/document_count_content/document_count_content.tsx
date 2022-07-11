/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiCodeBlock, EuiRange, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { sortedIndex } from 'lodash';
import { DocumentCountChart, DocumentCountChartPoint } from './document_count_chart';
import { TotalCountHeader } from './total_count_header';
import { DocumentCountStats } from '../../../../../common/types/field_stats';
export interface Props {
  documentCountStats?: DocumentCountStats;
  totalCount: number;
  samplingProbability?: number;
  setSamplingProbability?: (value: number) => void;
}

// @TODO: move this to constant file
const probabilities = [
  1.0, 0.5, 0.25, 0.1, 0.05, 0.025, 0.01, 0.005, 0.0025, 0.001, 0.0005, 0.00025, 0.0001, 0.00005,
  0.00001,
].reverse();

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
        <TotalCountHeader totalCount={totalCount} />
        <EuiFlexItem grow={true}>
          <EuiRange
            fullWidth
            min={0.00001}
            max={1}
            value={samplingProbability ?? 1}
            ticks={probabilities.map((d) => ({
              value: d,
              // label: d >= 0.0001 ? `${d * 100}` : '',
              label: d === 0.00001 || d >= 0.1 ? `${d * 100}%` : '',
            }))}
            onChange={(e) => {
              const newProbability = Number(e.currentTarget.value);
              const closestProbability = probabilities[sortedIndex(probabilities, newProbability)];

              if (setSamplingProbability) {
                console.log('setting closestProbability', closestProbability);

                setSamplingProbability(closestProbability);
              }
            }}
            showTicks
            showRange={false}
            step={0.00001}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <DocumentCountChart
        chartPoints={chartPoints}
        timeRangeEarliest={timeRangeEarliest}
        timeRangeLatest={timeRangeLatest}
        interval={documentCountStats.interval}
      />
      <EuiCodeBlock>{`randomly sampled: ${documentCountStats.randomlySampled}\nprobability: ${documentCountStats.probability}\ntook: ${documentCountStats.took}`}</EuiCodeBlock>
    </>
  );
};
