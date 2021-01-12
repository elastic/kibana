/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import type { FieldDataRowProps } from '../../../../stats_table/types/field_data_row';
import { DocumentCountChart, DocumentCountChartPoint } from '../document_count_chart';
import { TotalCountHeader } from '../../total_count_header';

export interface Props extends FieldDataRowProps {
  totalCount: number;
}

export const DocumentCountContent: FC<Props> = ({ config, totalCount }) => {
  const { stats } = config;
  if (stats === undefined) return null;

  const { documentCounts, timeRangeEarliest, timeRangeLatest } = stats;
  if (
    documentCounts === undefined ||
    timeRangeEarliest === undefined ||
    timeRangeLatest === undefined
  )
    return null;

  let chartPoints: DocumentCountChartPoint[] = [];
  if (documentCounts.buckets !== undefined) {
    const buckets: Record<string, number> = documentCounts?.buckets;
    chartPoints = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  return (
    <>
      <TotalCountHeader totalCount={totalCount} />
      <DocumentCountChart
        chartPoints={chartPoints}
        timeRangeEarliest={timeRangeEarliest}
        timeRangeLatest={timeRangeLatest}
      />
    </>
  );
};
