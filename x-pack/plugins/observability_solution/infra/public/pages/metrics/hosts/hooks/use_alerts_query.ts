/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';
import createContainer from 'constate';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsViewContext } from './use_hosts_view';
import { createAlertsEsQuery } from '../../../../utils/filters/create_alerts_es_query';

export const useAlertsQueryImpl = () => {
  const { hostNodes } = useHostsViewContext();

  const { searchCriteria } = useUnifiedSearchContext();

  const [alertStatus, setAlertStatus] = useState<AlertStatus>('all');

  const hostNodeNames = useMemo(() => hostNodes.map((n) => n.name), [hostNodes]);

  const getAlertsEsQuery = useCallback(
    (status?: AlertStatus) =>
      createAlertsEsQuery({ dateRange: searchCriteria.dateRange, hostNodeNames, status }),
    [hostNodeNames, searchCriteria.dateRange]
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
