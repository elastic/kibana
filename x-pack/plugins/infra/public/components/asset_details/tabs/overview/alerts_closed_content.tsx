/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertsEsQuery } from '../../../../common/alerts/types';
import { useAlertsCount } from '../../../../hooks/use_alerts_count';
import { infraAlertFeatureIds } from '../../../../pages/metrics/hosts/components/tabs/config';

export const AlertsClosedContent = ({ alertsEsQuery }: { alertsEsQuery: AlertsEsQuery }) => {
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
        content={i18n.translate('xpack.infra.assetDetails.activeAlertsContent.countError', {
          defaultMessage:
            'The active alert count was not retrieved correctly, try reloading the page.',
        })}
      >
        <EuiIcon color="warning" type="warning" />
      </EuiToolTip>
    );
  }

  const shouldRenderAlertsClosedContent = typeof alertsCount?.activeAlertCount === 'number';

  return shouldRenderAlertsClosedContent ? (
    alertsCount?.activeAlertCount > 0 ? (
      <span data-test-subj="infraAssetDetailsAlertsClosedContentWithAlerts">
        {i18n.translate('xpack.infra.assetDetails.activeAlertsContentClosedSection', {
          defaultMessage:
            '{alertsCount} {alertsCount, plural, one {active alert} other {active alerts}}',
          values: { alertsCount: alertsCount?.activeAlertCount },
        })}
      </span>
    ) : (
      <FormattedMessage
        id="xpack.infra.assetDetails.noActiveAlertsContentClosedSection"
        defaultMessage="No active alerts"
        data-test-subj="infraAssetDetailsAlertsClosedContentWithAlerts"
      />
    )
  ) : null;
};
