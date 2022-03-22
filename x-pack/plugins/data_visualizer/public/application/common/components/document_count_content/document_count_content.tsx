/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { DocumentCountChart, DocumentCountChartPoint } from './document_count_chart';
import { TotalCountHeader } from './total_count_header';
import { DocumentCountStats } from '../../../../../common/types/field_stats';

export interface Props {
  documentCountStats?: { results: DocumentCountStats; time: number };
  totalCount: number;
  // @todo: remove
  random?: boolean;
}

export const DocumentCountContent: FC<Props> = ({
  documentCountStats: stats,
  totalCount,
  random,
}) => {
  const documentCountStats = stats?.results;
  if (documentCountStats === undefined) {
    return totalCount !== undefined ? <TotalCountHeader totalCount={totalCount} /> : null;
  }

  const { timeRangeEarliest, timeRangeLatest } = documentCountStats;
  if (timeRangeEarliest === undefined || timeRangeLatest === undefined) return null;

  let chartPoints: DocumentCountChartPoint[] = [];
  if (documentCountStats.buckets !== undefined) {
    const buckets: Record<string, number> = documentCountStats?.buckets;
    chartPoints = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  return (
    <>
      <TotalCountHeader totalCount={totalCount} />
      <div>
        {random ?? 'random '}
        {stats?.time}
      </div>
      <DocumentCountChart
        chartPoints={chartPoints}
        timeRangeEarliest={timeRangeEarliest}
        timeRangeLatest={timeRangeLatest}
        interval={documentCountStats.interval}
      />
    </>
  );
};
