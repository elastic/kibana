/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon, EuiLoadingSpinner, EuiNotificationBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAlertsCount } from '../../../../../hooks/use_alerts_count';
import { infraAlertFeatureIds } from './config';
import { useAlertsQuery } from '../../hooks/use_alerts_query';

export const AlertsTabBadge = () => {
  const { alertsEsQuery } = useAlertsQuery();

  const { alertsCount, loading, error } = useAlertsCount({
    featureIds: infraAlertFeatureIds,
    query: alertsEsQuery,
  });

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

  const shouldRenderBadge =
    typeof alertsCount?.activeAlertCount === 'number' && alertsCount.activeAlertCount > 0;

  return shouldRenderBadge ? (
    <EuiNotificationBadge
      className="eui-alignCenter"
      size="m"
      data-test-subj="hostsView-tabs-alerts-count"
    >
      {alertsCount?.activeAlertCount}
    </EuiNotificationBadge>
  ) : null;
};
