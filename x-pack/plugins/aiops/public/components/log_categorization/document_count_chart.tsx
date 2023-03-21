/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { DocumentCountChart as DocumentCountChartRoot } from '../document_count_content/document_count_chart';
import { TotalCountHeader } from '../document_count_content/total_count_header';
import type { Category, SparkLinesPerCategory } from './use_categorize_request';
import type { EventRate } from './use_categorize_request';
import { DocumentCountStats } from '../../get_document_stats';

interface Props {
  totalCount: number;
  pinnedCategory: Category | null;
  selectedCategory: Category | null;
  eventRate: EventRate;
  sparkLines: SparkLinesPerCategory;
  documentCountStats?: DocumentCountStats;
}

export const DocumentCountChart: FC<Props> = ({
  eventRate,
  sparkLines,
  totalCount,
  pinnedCategory,
  selectedCategory,
  documentCountStats,
}) => {
  const chartPointsSplitLabel = i18n.translate(
    'xpack.aiops.logCategorization.chartPointsSplitLabel',
    {
      defaultMessage: 'Selected category',
    }
  );
  const chartPoints = useMemo(() => {
    const category = selectedCategory ?? pinnedCategory ?? null;
    return eventRate.map(({ key, docCount }) => {
      let value = docCount;
      if (category && sparkLines[category.key] && sparkLines[category.key][key]) {
        value -= sparkLines[category.key][key];
      }
      return { time: key, value };
    });
  }, [eventRate, pinnedCategory, selectedCategory, sparkLines]);

  const chartPointsSplit = useMemo(() => {
    const category = selectedCategory ?? pinnedCategory ?? null;
    return category !== null
      ? eventRate.map(({ key }) => {
          const value =
            sparkLines && sparkLines[category.key] && sparkLines[category.key][key]
              ? sparkLines[category.key][key]
              : 0;
          return { time: key, value };
        })
      : undefined;
  }, [eventRate, pinnedCategory, selectedCategory, sparkLines]);

  if (documentCountStats?.interval === undefined) {
    return null;
  }

  return (
    <>
      <TotalCountHeader totalCount={totalCount} />
      <DocumentCountChartRoot
        chartPoints={chartPoints}
        chartPointsSplit={chartPointsSplit}
        timeRangeEarliest={eventRate[0].key}
        timeRangeLatest={eventRate[eventRate.length - 1].key}
        interval={documentCountStats.interval}
        chartPointsSplitLabel={chartPointsSplitLabel}
        isBrushCleared={false}
      />
    </>
  );
};
