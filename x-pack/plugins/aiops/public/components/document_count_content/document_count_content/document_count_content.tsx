/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';

import type { WindowParameters } from '@kbn/aiops-utils';
import type { ChangePoint } from '@kbn/ml-agg-utils';

import { DocumentCountChart, DocumentCountChartPoint } from '../document_count_chart';
import { TotalCountHeader } from '../total_count_header';
import { DocumentCountStats } from '../../../get_document_stats';

export interface DocumentCountContentProps {
  brushSelectionUpdateHandler: (d: WindowParameters) => void;
  changePoint?: ChangePoint;
  documentCountStats?: DocumentCountStats;
  documentCountStatsSplit?: DocumentCountStats;
  totalCount: number;
}

export const DocumentCountContent: FC<DocumentCountContentProps> = ({
  brushSelectionUpdateHandler,
  changePoint,
  documentCountStats,
  documentCountStatsSplit,
  totalCount,
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

  let chartPointsSplit: DocumentCountChartPoint[] | undefined;
  if (documentCountStatsSplit?.buckets !== undefined) {
    const buckets: Record<string, number> = documentCountStatsSplit?.buckets;
    chartPointsSplit = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  return (
    <>
      <TotalCountHeader totalCount={totalCount} />
      {documentCountStats.interval !== undefined && (
        <DocumentCountChart
          brushSelectionUpdateHandler={brushSelectionUpdateHandler}
          chartPoints={chartPoints}
          chartPointsSplit={chartPointsSplit}
          timeRangeEarliest={timeRangeEarliest}
          timeRangeLatest={timeRangeLatest}
          interval={documentCountStats.interval}
          changePoint={changePoint}
        />
      )}
    </>
  );
};
