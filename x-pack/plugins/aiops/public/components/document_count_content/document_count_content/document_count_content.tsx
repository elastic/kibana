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

import { useAppSelector } from '@kbn/aiops-log-rate-analysis/state';
import { DocumentCountChartRedux } from '@kbn/aiops-components';

import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { TotalCountHeader } from '../total_count_header';

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

  const { documentStats } = useAppSelector((s) => s.logRateAnalysis);
  const { sampleProbability, totalCount, documentCountStats } = documentStats;

  if (documentCountStats === undefined) {
    return totalCount !== undefined ? (
      <TotalCountHeader totalCount={totalCount} sampleProbability={sampleProbability} />
    ) : null;
  }

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem>
        <TotalCountHeader totalCount={totalCount} sampleProbability={sampleProbability} />
      </EuiFlexItem>
      <EuiFlexItem>
        <DocumentCountChartRedux
          dependencies={{ data, uiSettings, fieldFormats, charts }}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
          changePoint={documentCountStats.changePoint}
          {...docCountChartProps}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
