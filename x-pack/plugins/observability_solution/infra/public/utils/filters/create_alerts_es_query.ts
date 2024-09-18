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
import {
  findInventoryFields,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';
import { buildCombinedAssetFilter } from './build';
import { ALERT_STATUS_QUERY } from '../../components/shared/alerts/constants';

export interface AlertsEsQuery {
  bool: BoolQuery;
}

export const createAlertsEsQuery = ({
  dateRange,
  assetIds,
  status,
  assetType,
}: {
  dateRange: TimeRange;
  assetIds: string[];
  status?: AlertStatus;
  assetType?: InventoryItemType;
}): AlertsEsQuery => {
  const alertStatusFilter = createAlertStatusFilter(status);

  const dateFilter = createDateFilter(dateRange);
  const hostsFilter = buildCombinedAssetFilter({
    field: findInventoryFields(assetType ?? 'host').id,
    values: assetIds,
  });

  const filters = [alertStatusFilter, dateFilter, hostsFilter].filter(Boolean) as Filter[];

  return buildEsQuery(undefined, [], filters);
};

const createDateFilter = (date: TimeRange) =>
  getTime(undefined, date, { fieldName: ALERT_TIME_RANGE });

const createAlertStatusFilter = (status: AlertStatus = 'all'): Filter | null =>
  ALERT_STATUS_QUERY[status] ? { query: ALERT_STATUS_QUERY[status], meta: {} } : null;
