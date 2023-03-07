/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash';
import type { AlertsByGroupingAgg, AlertsProgressBarData, GroupBySelection } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import type { BucketItem } from '../../../../../common/search_strategy/security_solution/cti';
import type { SummaryChartsData, SummaryChartsAgg } from '../alerts_summary_charts_panel/types';
import * as i18n from './translations';

export const parseAlertsGroupingData = (
  response: AlertSearchResponse<{}, AlertsByGroupingAgg>
): AlertsProgressBarData[] => {
  const buckets = response?.aggregations?.alertsByGrouping?.buckets ?? [];
  const emptyFieldCount = response?.aggregations?.missingFields?.doc_count ?? 0;
  if (buckets.length === 0 && emptyFieldCount === 0) {
    return [];
  }

  const other = response?.aggregations?.alertsByGrouping?.sum_other_doc_count ?? 0;
  const total =
    buckets.reduce((acc: number, group: BucketItem) => acc + group.doc_count, 0) +
    other +
    emptyFieldCount;

  const topAlerts = buckets.map((group) => {
    return {
      key: group.key,
      value: group.doc_count,
      percentage: Math.round((group.doc_count / total) * 1000) / 10,
      label: group.key,
    };
  });

  if (other > 0) {
    topAlerts.push({
      key: 'Other',
      value: other,
      percentage: Math.round((other / total) * 1000) / 10,
      label: i18n.OTHER,
    });
  }

  if (emptyFieldCount > 0) {
    topAlerts.push({
      key: '-',
      value: emptyFieldCount,
      percentage: Math.round((emptyFieldCount / total) * 1000) / 10,
      label: '-',
    });
  }

  return topAlerts;
};

export const getNonEmptyPercent = (topAlerts: AlertsProgressBarData[]): number => {
  const consolidated = topAlerts.reduce(
    (ret, cur) => {
      ret.total += cur.value;
      if (cur.key !== '-') {
        ret.nonEmpty += cur.value;
      }
      return ret;
    },
    { total: 0, nonEmpty: 0 }
  );
  return consolidated.total > 0
    ? Math.round((consolidated.nonEmpty / consolidated.total) * 100)
    : 0;
};

export const getIsAlertsProgressBarData = (
  data: SummaryChartsData[]
): data is AlertsProgressBarData[] => {
  return data?.every((x) => has(x, 'percentage'));
};

export const getIsAlertsByGroupingAgg = (
  data: AlertSearchResponse<{}, SummaryChartsAgg>
): data is AlertSearchResponse<{}, AlertsByGroupingAgg> => {
  return has(data, 'aggregations.alertsByGrouping');
};

const labels = {
  'host.name': i18n.HOST_NAME_LABEL,
  'user.name': i18n.USER_NAME_LABEL,
  'source.ip': i18n.SOURCE_LABEL,
  'destination.ip': i18n.DESTINATION_LABEL,
};

export const getGroupByLabel = (option: GroupBySelection): string => {
  return labels[option];
};
