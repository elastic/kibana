/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { WindowParameters } from '@kbn/aiops-utils';

import { LOG_RATE_ANALYSIS_TYPE, type LogRateAnalysisType } from '../../../../common/constants';

import { DocumentCountStats } from '../../../get_document_stats';

import { DocumentCountChart, DocumentCountChartPoint } from '../document_count_chart';
import { TotalCountHeader } from '../total_count_header';

export interface DocumentCountContentProps {
  analysisType: LogRateAnalysisType;
  brushSelectionUpdateHandler: (d: WindowParameters, force: boolean) => void;
  documentCountStats?: DocumentCountStats;
  documentCountStatsSplit?: DocumentCountStats;
  documentCountStatsSplitLabel?: string;
  isBrushCleared: boolean;
  totalCount: number;
  sampleProbability: number;
  initialAnalysisStart?: number | WindowParameters;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
}

export const DocumentCountContent: FC<DocumentCountContentProps> = ({
  analysisType = LOG_RATE_ANALYSIS_TYPE.SPIKE,
  brushSelectionUpdateHandler,
  documentCountStats,
  documentCountStatsSplit,
  documentCountStatsSplitLabel = '',
  isBrushCleared,
  totalCount,
  sampleProbability,
  initialAnalysisStart,
  barColorOverride,
  barHighlightColorOverride,
}) => {
  const bucketTimestamps = Object.keys(documentCountStats?.buckets ?? {}).map((time) => +time);
  const splitBucketTimestamps = Object.keys(documentCountStatsSplit?.buckets ?? {}).map(
    (time) => +time
  );
  const timeRangeEarliest = Math.min(...[...bucketTimestamps, ...splitBucketTimestamps]);
  const timeRangeLatest = Math.max(...[...bucketTimestamps, ...splitBucketTimestamps]);

  if (
    documentCountStats === undefined ||
    documentCountStats.buckets === undefined ||
    timeRangeEarliest === undefined ||
    timeRangeLatest === undefined
  ) {
    return totalCount !== undefined ? (
      <TotalCountHeader totalCount={totalCount} sampleProbability={sampleProbability} />
    ) : null;
  }

  const chartPoints: DocumentCountChartPoint[] = Object.entries(documentCountStats.buckets).map(
    ([time, value]) => ({
      time: +time,
      value,
    })
  );

  let chartPointsSplit: DocumentCountChartPoint[] | undefined;
  if (documentCountStatsSplit?.buckets !== undefined) {
    chartPointsSplit = Object.entries(documentCountStatsSplit?.buckets).map(([time, value]) => ({
      time: +time,
      value,
    }));
  }

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem>
        <TotalCountHeader totalCount={totalCount} sampleProbability={sampleProbability} />
      </EuiFlexItem>
      {documentCountStats.interval !== undefined && (
        <EuiFlexItem>
          <DocumentCountChart
            analysisType={analysisType}
            brushSelectionUpdateHandler={brushSelectionUpdateHandler}
            chartPoints={chartPoints}
            chartPointsSplit={chartPointsSplit}
            timeRangeEarliest={timeRangeEarliest}
            timeRangeLatest={timeRangeLatest}
            interval={documentCountStats.interval}
            chartPointsSplitLabel={documentCountStatsSplitLabel}
            isBrushCleared={isBrushCleared}
            autoAnalysisStart={initialAnalysisStart}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
