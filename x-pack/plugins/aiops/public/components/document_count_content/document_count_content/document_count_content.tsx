/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, FC } from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { WindowParameters } from '@kbn/aiops-utils';
import type { ChangePoint } from '@kbn/ml-agg-utils';

import { DocumentCountChart, DocumentCountChartPoint } from '../document_count_chart';
import { TotalCountHeader } from '../total_count_header';
import { DocumentCountStats } from '../../../get_document_stats';

const clearSelectionLabel = i18n.translate(
  'xpack.aiops.documentCountContent.clearSelectionAriaLabel',
  {
    defaultMessage: 'Clear selection',
  }
);

export interface DocumentCountContentProps {
  brushSelectionUpdateHandler: (d: WindowParameters) => void;
  clearSelectionHandler: () => void;
  changePoint?: ChangePoint;
  documentCountStats?: DocumentCountStats;
  documentCountStatsSplit?: DocumentCountStats;
  totalCount: number;
  windowParameters?: WindowParameters;
}

export const DocumentCountContent: FC<DocumentCountContentProps> = ({
  brushSelectionUpdateHandler,
  clearSelectionHandler,
  changePoint,
  documentCountStats,
  documentCountStatsSplit,
  totalCount,
  windowParameters,
}) => {
  const [isBrushCleared, setIsBrushCleared] = useState(true);

  useEffect(() => {
    setIsBrushCleared(windowParameters === undefined);
  }, [windowParameters]);

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

  let chartPointsSplit: DocumentCountChartPoint[] | undefined;
  if (documentCountStatsSplit?.buckets !== undefined) {
    const buckets: Record<string, number> = documentCountStatsSplit?.buckets;
    chartPointsSplit = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  function brushSelectionUpdate(d: WindowParameters, force: boolean) {
    if (!isBrushCleared || force) {
      brushSelectionUpdateHandler(d);
    }
    if (force) {
      setIsBrushCleared(false);
    }
  }

  function clearSelection() {
    setIsBrushCleared(true);
    clearSelectionHandler();
  }

  return (
    <>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <TotalCountHeader totalCount={totalCount} />
        </EuiFlexItem>
        {!isBrushCleared && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={clearSelection}
              size="xs"
              data-test-subj="aiopsClearSelectionBadge"
            >
              {clearSelectionLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {documentCountStats.interval !== undefined && (
        <DocumentCountChart
          brushSelectionUpdateHandler={brushSelectionUpdate}
          chartPoints={chartPoints}
          chartPointsSplit={chartPointsSplit}
          timeRangeEarliest={timeRangeEarliest}
          timeRangeLatest={timeRangeLatest}
          interval={documentCountStats.interval}
          changePoint={changePoint}
          isBrushCleared={isBrushCleared}
        />
      )}
    </>
  );
};
