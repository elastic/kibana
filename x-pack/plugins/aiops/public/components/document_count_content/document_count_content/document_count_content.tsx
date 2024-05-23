/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  BarStyleAccessor,
  RectAnnotationSpec,
} from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';

import type {
  DocumentCountStats,
  LogRateHistogramItem,
  WindowParameters,
} from '@kbn/aiops-log-rate-analysis';
import { DocumentCountChartRedux } from '@kbn/aiops-components';

import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { TotalCountHeader } from '../total_count_header';

export interface DocumentCountContentProps {
  documentCountStats?: DocumentCountStats;
  documentCountStatsSplit?: DocumentCountStats;
  documentCountStatsSplitLabel?: string;
  totalCount: number;
  sampleProbability: number;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  windowParameters?: WindowParameters;
  baselineLabel?: string;
  deviationLabel?: string;
  barStyleAccessor?: BarStyleAccessor;
  baselineAnnotationStyle?: RectAnnotationSpec['style'];
  deviationAnnotationStyle?: RectAnnotationSpec['style'];
}

export const DocumentCountContent: FC<DocumentCountContentProps> = ({
  documentCountStats,
  documentCountStatsSplit,
  documentCountStatsSplitLabel = '',
  totalCount,
  sampleProbability,
  barColorOverride,
  barHighlightColorOverride,
  windowParameters,
  ...docCountChartProps
}) => {
  const { data, uiSettings, fieldFormats, charts } = useAiopsAppContext();

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

  const chartPoints: LogRateHistogramItem[] = Object.entries(documentCountStats.buckets).map(
    ([time, value]) => ({
      time: +time,
      value,
    })
  );

  let chartPointsSplit: LogRateHistogramItem[] | undefined;
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
          <DocumentCountChartRedux
            dependencies={{ data, uiSettings, fieldFormats, charts }}
            chartPoints={chartPoints}
            chartPointsSplit={chartPointsSplit}
            timeRangeEarliest={timeRangeEarliest}
            timeRangeLatest={timeRangeLatest}
            interval={documentCountStats.interval}
            chartPointsSplitLabel={documentCountStatsSplitLabel}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
            changePoint={documentCountStats.changePoint}
            {...docCountChartProps}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
