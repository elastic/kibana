/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTime } from '@kbn/data-plugin/common';
import { ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import { BoolQuery, buildEsQuery, Filter, type TimeRange } from '@kbn/es-query';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import { buildCombinedHostsFilter } from './build';
import { ALERT_STATUS_QUERY } from '../../components/shared/alerts/constants';
import { HOST_NAME_FIELD } from '../../../common/constants';

export interface AlertsEsQuery {
  bool: BoolQuery;
}

export const createAlertsEsQuery = ({
  dateRange,
  hostNodeNames,
  status,
}: {
  dateRange: TimeRange;
  hostNodeNames: string[];
  status?: AlertStatus;
}): AlertsEsQuery => {
  const alertStatusFilter = createAlertStatusFilter(status);

  const dateFilter = createDateFilter(dateRange);
  const hostsFilter = buildCombinedHostsFilter({
    field: HOST_NAME_FIELD,
    values: hostNodeNames,
  });

  const filters = [alertStatusFilter, dateFilter, hostsFilter].filter(Boolean) as Filter[];

  return buildEsQuery(undefined, [], filters);
};

const createDateFilter = (date: TimeRange) =>
  getTime(undefined, date, { fieldName: ALERT_TIME_RANGE });

const createAlertStatusFilter = (status: AlertStatus = 'all'): Filter | null =>
  ALERT_STATUS_QUERY[status] ? { query: ALERT_STATUS_QUERY[status], meta: {} } : null;
