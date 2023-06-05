/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';
import createContainer from 'constate';
import { getTime } from '@kbn/data-plugin/common';
import { ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import { BoolQuery, buildEsQuery, Filter } from '@kbn/es-query';
import { InfraAssetMetricsItem } from '../../../../../common/http_api';
import { useUnifiedSearchContext } from './use_unified_search';
import { HostsState } from './use_unified_search_url_state';
import { useHostsViewContext } from './use_hosts_view';
import { AlertStatus } from '../types';
import { ALERT_STATUS_QUERY } from '../constants';
import { createHostsFilter } from '../utils';

export interface AlertsEsQuery {
  bool: BoolQuery;
}

export const useAlertsQueryImpl = () => {
  const { hostNodes } = useHostsViewContext();

  const { searchCriteria } = useUnifiedSearchContext();

  const [alertStatus, setAlertStatus] = useState<AlertStatus>('all');

  const getAlertsEsQuery = useCallback(
    (status?: AlertStatus) =>
      createAlertsEsQuery({ dateRange: searchCriteria.dateRange, hostNodes, status }),
    [hostNodes, searchCriteria.dateRange]
  );

  // Regenerate the query when status change even if is not used.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const alertsEsQuery = useMemo(() => getAlertsEsQuery(), [getAlertsEsQuery, alertStatus]);

  const alertsEsQueryByStatus = useMemo(
    () => getAlertsEsQuery(alertStatus),
    [getAlertsEsQuery, alertStatus]
  );

  return {
    alertStatus,
    setAlertStatus,
    alertsEsQuery,
    alertsEsQueryByStatus,
  };
};

export const AlertsQueryContainer = createContainer(useAlertsQueryImpl);
export const [AlertsQueryProvider, useAlertsQuery] = AlertsQueryContainer;

/**
 * Helpers
 */
const createAlertsEsQuery = ({
  dateRange,
  hostNodes,
  status,
}: {
  dateRange: HostsState['dateRange'];
  hostNodes: InfraAssetMetricsItem[];
  status?: AlertStatus;
}): AlertsEsQuery => {
  const alertStatusFilter = createAlertStatusFilter(status);

  const dateFilter = createDateFilter(dateRange);
  const hostsFilter = createHostsFilter(hostNodes.map((p) => p.name));

  const filters = [alertStatusFilter, dateFilter, hostsFilter].filter(Boolean) as Filter[];

  return buildEsQuery(undefined, [], filters);
};

const createDateFilter = (date: HostsState['dateRange']) =>
  getTime(undefined, date, { fieldName: ALERT_TIME_RANGE });

const createAlertStatusFilter = (status: AlertStatus = 'all'): Filter | null =>
  ALERT_STATUS_QUERY[status] ? { query: ALERT_STATUS_QUERY[status], meta: {} } : null;
