/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WindowParameters, LogRateHistogramItem } from '@kbn/aiops-utils';
import React, { FC } from 'react';
import { DocumentCountChart } from '@kbn/aiops-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { BrushSelectionUpdateHandler, DocumentCountChartProps } from '@kbn/aiops-components';
import { RandomSampler } from '@kbn/ml-random-sampler-utils';
import { useDataVisualizerKibana } from '../kibana_context';
import { DocumentCountStats } from '../../../common/types/field_stats';
import { TotalCountHeader } from '../common/components/document_count_content/total_count_header';
import { SamplingMenu } from '../common/components/random_sampling_menu/random_sampling_menu';

export interface DocumentCountContentProps
  extends Omit<
    DocumentCountChartProps,
    | 'dependencies'
    | 'chartPoints'
    | 'timeRangeEarliest'
    | 'timeRangeLatest'
    | 'interval'
    | 'chartPointsSplitLabel'
  > {
  brushSelectionUpdateHandler: BrushSelectionUpdateHandler;
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
  windowParameters?: WindowParameters;
  incomingInitialAnalysisStart?: number | WindowParameters;
  randomSampler: RandomSampler;
  reload: () => void;
  approximate: boolean;
}

export const DocumentCountWithDualBrush: FC<DocumentCountContentProps> = ({
  randomSampler,
  reload,
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
  windowParameters,
  incomingInitialAnalysisStart,
  approximate,
  ...docCountChartProps
}) => {
  const {
    services: { data, uiSettings, fieldFormats, charts },
  } = useDataVisualizerKibana();

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
    return totalCount !== undefined ? <TotalCountHeader totalCount={totalCount} /> : null;
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
      <EuiFlexGroup gutterSize="m" direction="row">
        <EuiFlexItem>
          <TotalCountHeader totalCount={totalCount} approximate={approximate} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SamplingMenu randomSampler={randomSampler} reload={reload} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {documentCountStats.interval !== undefined && (
        <EuiFlexItem>
          <DocumentCountChart
            dependencies={{ data, uiSettings, fieldFormats, charts }}
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
            {...docCountChartProps}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
