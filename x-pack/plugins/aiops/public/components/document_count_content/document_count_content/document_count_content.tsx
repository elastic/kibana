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

import { i18n } from '@kbn/i18n';
import type { LogRateHistogramItem } from '@kbn/aiops-log-rate-analysis';
import {
  useAppSelector,
  useCurrentSelectedGroup,
  useCurrentSelectedSignificantItem,
  type GroupTableItem,
} from '@kbn/aiops-log-rate-analysis/state';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import { DocumentCountChartRedux } from '@kbn/aiops-components';

import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { TotalCountHeader } from '../total_count_header';

function getDocumentCountStatsSplitLabel(
  significantItem?: SignificantItem,
  group?: GroupTableItem
): string {
  if (significantItem) {
    return `${significantItem?.fieldName}:${significantItem?.fieldValue}`;
  } else if (group) {
    return i18n.translate('xpack.aiops.logRateAnalysis.page.documentCountStatsSplitGroupLabel', {
      defaultMessage: 'Selected group',
    });
  } else {
    return '';
  }
}

export interface DocumentCountContentProps {
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  baselineLabel?: string;
  deviationLabel?: string;
  barStyleAccessor?: BarStyleAccessor;
  baselineAnnotationStyle?: RectAnnotationSpec['style'];
  deviationAnnotationStyle?: RectAnnotationSpec['style'];
}

export const DocumentCountContent: FC<DocumentCountContentProps> = ({
  barColorOverride,
  barHighlightColorOverride,
  ...docCountChartProps
}) => {
  const { data, uiSettings, fieldFormats, charts } = useAiopsAppContext();

  const currentSelectedGroup = useCurrentSelectedGroup();
  const currentSelectedSignificantItem = useCurrentSelectedSignificantItem();
  const { documentStats } = useAppSelector((s) => s.logRateAnalysis);
  const { sampleProbability, totalCount, documentCountStats, documentCountStatsCompare } =
    documentStats;
  const documentCountStatsSplitLabel = getDocumentCountStatsSplitLabel(
    currentSelectedSignificantItem,
    currentSelectedGroup
  );

  const bucketTimestamps = Object.keys(documentCountStats?.buckets ?? {}).map((time) => +time);
  const splitBucketTimestamps = Object.keys(documentCountStatsCompare?.buckets ?? {}).map(
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
  if (documentCountStatsCompare?.buckets !== undefined) {
    chartPointsSplit = Object.entries(documentCountStatsCompare?.buckets).map(([time, value]) => ({
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
