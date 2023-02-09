/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { buildEsQuery, Query } from '@kbn/es-query';
import { ALERT_STATUS_QUERY } from '@kbn/observability-plugin/public';
import { AlertStatus } from '@kbn/observability-plugin/common';
import { SnapshotNode } from '../../../../../common/http_api';
import { useUnifiedSearchContext } from './use_unified_search';
import { HostsState } from './use_unified_search_url_state';
import { useHostsView } from './use_hosts_view';

export const useAlertsQueryImpl = () => {
  const { hostNodes } = useHostsView();

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
}) => {
  const hostsQuery = createHostsQuery(hostNodes);
  const alertStatusQuery = createAlertStatusQuery(status);

  const dateFilter = createDateFilter(dateRange);

  const queries = [hostsQuery, alertStatusQuery].filter(Boolean) as Query[];
  const filters = dateFilter ? [dateFilter] : [];

  return buildEsQuery(undefined, queries, filters);
};

const createDateFilter = (date: HostsState['dateRange']) =>
  getTime(undefined, date, { fieldName: TIMESTAMP });

const createAlertStatusQuery = (status: AlertStatus = 'all'): Query | null =>
  ALERT_STATUS_QUERY[status] ? { query: ALERT_STATUS_QUERY[status], language: 'kuery' } : null;

const createHostsQuery = (hosts: SnapshotNode[]): Query => ({
  language: 'kuery',
  query:
    hosts.length > 0
      ? hosts.map((host) => `host.name : "${host.name}"`).join(' or ')
      : 'host.name : ""',
});
