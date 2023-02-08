/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { EuiNotificationBadge } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAlertsCount } from '../../../../../hooks/use_alerts_count';
import { infraAlertFeatureIds } from './config';
import { useAlertsQuery } from '../../hooks/use_alerts_query';

export const AlertsTabBadge = () => {
  const { alertsEsQuery, alertStatus } = useAlertsQuery();

  const { alertsCount, loading, error, refetch } = useAlertsCount({
    featureIds: infraAlertFeatureIds,
    filter: alertsEsQuery,
  });

  // Refetch the alerts count on status change to keep in sync with AlertSummary count
  useEffect(() => {
    refetch();
  }, [refetch, alertStatus]);

  if (loading) {
    return <EuiLoadingSpinner />;
  }

  if (error) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.countError', {
          defaultMessage:
            'The active alert count was not retrieved correctly, try reloading the page.',
        })}
      >
        <EuiIcon color="warning" type="alert" />
      </EuiToolTip>
    );
  }

  return (
    <EuiNotificationBadge className="eui-alignCenter" size="m">
      {alertsCount?.activeAlertCount}
    </EuiNotificationBadge>
  );
};
