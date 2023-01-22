/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash';
import type { AlertsByGroupingAgg, AlertsProgressBarData } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { BucketItem } from '../../../../../common/search_strategy/security_solution/cti';
import type { SummaryChartsData } from '../alerts_summary_charts_panel/types';

export const parseAlertsGroupingData = (
  response: AlertSearchResponse<{}, AlertsByGroupingAgg>
): AlertsProgressBarData[] => {
  const buckets = response?.aggregations?.alertsByGrouping?.buckets ?? [];
  if (buckets.length === 0) {
    return [];
  }

  const other = response?.aggregations?.alertsByGrouping?.sum_other_doc_count ?? 0;
  const total =
    buckets.reduce((acc: number, group: BucketItem) => acc + group.doc_count, 0) + other;

  const topHosts = buckets.map((group) => {
    return {
      key: group.key,
      value: group.doc_count,
      percentage: Math.round((group.doc_count / total) * 1000) / 10,
      label: group.key,
    };
  });

  topHosts.push({
    key: 'Other',
    value: other,
    percentage: Math.round((other / total) * 1000) / 10,
    label: 'Other',
  });

  return topHosts;
};

export const isAlertsProgressBarData = (
  data: SummaryChartsData[]
): data is AlertsProgressBarData[] => {
  return data?.every((x) => has(x, 'percentage'));
};
