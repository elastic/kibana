/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { FILTER_CLOSED } from '@kbn/securitysolution-data-table/common/types';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsByStatus } from '../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type { ParsedAlertsData } from '../../overview/components/detection_response/alerts_by_status/types';

export const useNonClosedAlerts = ({
  field,
  value,
  to,
  from,
  queryId,
}: {
  field: 'host.name' | 'user.name';
  value: string;
  to: string;
  from: string;
  queryId: string;
}) => {
  const { signalIndexName } = useSignalIndex();

  const entityFilter = useMemo(() => ({ field, value }), [field, value]);

  const { items: alertsData } = useAlertsByStatus({
    entityFilter,
    signalIndexName,
    queryId,
    to,
    from,
  });

  const filteredAlertsData: ParsedAlertsData = alertsData
    ? Object.fromEntries(Object.entries(alertsData).filter(([key]) => key !== FILTER_CLOSED))
    : {};

  const hasNonClosedAlerts =
    (filteredAlertsData?.acknowledged?.total || 0) + (filteredAlertsData?.open?.total || 0) > 0;

  return { hasNonClosedAlerts, filteredAlertsData };
};
