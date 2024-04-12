/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiNotificationBadge } from '@elastic/eui';
import React from 'react';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchActiveAlerts } from '../../../hooks/use_fetch_active_alerts';
import { ALERTS_TAB_ID, OVERVIEW_TAB_ID, SloTabId } from '../components/slo_details';

export const useSloDetailsTabs = ({
  slo,
  isAutoRefreshing,
  selectedTabId,
  setSelectedTabId,
}: {
  isAutoRefreshing: boolean;
  slo?: SLOWithSummaryResponse | null;
  selectedTabId: SloTabId;
  setSelectedTabId: (val: SloTabId) => void;
}) => {
  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slo ? [[slo.id, slo.instanceId ?? ALL_VALUE]] : [],
    shouldRefetch: isAutoRefreshing,
  });

  const tabs = [
    {
      id: OVERVIEW_TAB_ID,
      label: i18n.translate('xpack.slo.sloDetails.tab.overviewLabel', {
        defaultMessage: 'Overview',
      }),
      'data-test-subj': 'overviewTab',
      isSelected: selectedTabId === OVERVIEW_TAB_ID,
      onClick: () => setSelectedTabId(OVERVIEW_TAB_ID),
    },
    {
      id: ALERTS_TAB_ID,
      label: i18n.translate('xpack.slo.sloDetails.tab.alertsLabel', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'alertsTab',
      isSelected: selectedTabId === ALERTS_TAB_ID,
      append: slo ? (
        <EuiNotificationBadge className="eui-alignCenter" size="m">
          {(activeAlerts && activeAlerts.get(slo)) ?? 0}
        </EuiNotificationBadge>
      ) : null,
      onClick: () => setSelectedTabId(ALERTS_TAB_ID),
    },
  ];

  return { tabs };
};
