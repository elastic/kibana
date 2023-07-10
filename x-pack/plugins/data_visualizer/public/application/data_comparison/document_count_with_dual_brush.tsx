/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WindowParameters } from '@kbn/aiops-utils';
import {
  BarStyleAccessor,
  RectAnnotationSpec,
} from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import React, { FC } from 'react';
import { DocumentCountChart, type DocumentCountChartPoint } from '@kbn/aiops-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDataVisualizerKibana } from '../kibana_context';
import { DocumentCountStats } from '../../../common/types/field_stats';
import { TotalCountHeader } from '../common/components/document_count_content/total_count_header';

export interface DocumentCountContentProps {
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
  windowParameters?: WindowParameters;
  incomingInitialAnalysisStart?: number | WindowParameters;
  baselineLabel?: string;
  deviationLabel?: string;
  barStyleAccessor?: BarStyleAccessor;
  baselineAnnotationStyle?: RectAnnotationSpec['style'];
  deviationAnnotationStyle?: RectAnnotationSpec['style'];
}

export const DocumentCountWithDualBrush: FC<DocumentCountContentProps> = ({
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
        <TotalCountHeader totalCount={totalCount} />
      </EuiFlexItem>
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
