/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';
import createContainer from 'constate';
import { getTime } from '@kbn/data-plugin/common';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { BoolQuery, buildEsQuery, Filter } from '@kbn/es-query';
import { SnapshotNode } from '../../../../../common/http_api';
import { useUnifiedSearchContext } from './use_unified_search';
import { HostsState } from './use_unified_search_url_state';
import { useHostsViewContext } from './use_hosts_view';
import { AlertStatus } from '../types';
import { ALERT_STATUS_QUERY } from '../constants';

export interface AlertsEsQuery {
  bool: BoolQuery;
}

export const useAlertsQueryImpl = () => {
  const { hostNodes } = useHostsViewContext();

  const { unifiedSearchDateRange } = useUnifiedSearchContext();

  const [alertStatus, setAlertStatus] = useState<AlertStatus>('all');

  const getAlertsEsQuery = useCallback(
    (status?: AlertStatus) =>
      createAlertsEsQuery({ dateRange: unifiedSearchDateRange, hostNodes, status }),
    [hostNodes, unifiedSearchDateRange]
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
  hostNodes: SnapshotNode[];
  status?: AlertStatus;
}): AlertsEsQuery => {
  const alertStatusFilter = createAlertStatusFilter(status);

  const dateFilter = createDateFilter(dateRange);
  const hostsFilter = createHostsFilter(hostNodes);

  const filters = [alertStatusFilter, dateFilter, hostsFilter].filter(Boolean) as Filter[];

  return buildEsQuery(undefined, [], filters);
};

const createDateFilter = (date: HostsState['dateRange']) =>
  getTime(undefined, date, { fieldName: TIMESTAMP });

const createAlertStatusFilter = (status: AlertStatus = 'all'): Filter | null =>
  ALERT_STATUS_QUERY[status] ? { query: ALERT_STATUS_QUERY[status], meta: {} } : null;

const createHostsFilter = (hosts: SnapshotNode[]): Filter => ({
  query: {
    terms: {
      'host.name': hosts.map((p) => p.name),
    },
  },
  meta: {},
});
