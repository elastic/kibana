/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FieldDataCardProps } from '../field_data_card';
import { DocumentCountChart, DocumentCountChartPoint } from '../document_count_chart';

export const DocumentCountContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;

  const { documentCounts, timeRangeEarliest, timeRangeLatest } = stats;

  let chartPoints: DocumentCountChartPoint[] = [];
  if (documentCounts !== undefined && documentCounts.buckets !== undefined) {
    const buckets: Record<string, number> = stats.documentCounts.buckets;
    chartPoints = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  return (
    <DocumentCountChart
      chartPoints={chartPoints}
      timeRangeEarliest={timeRangeEarliest}
      timeRangeLatest={timeRangeLatest}
    />
  );
};
