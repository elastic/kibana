/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiIcon, useEuiTheme } from '@elastic/eui';

export const AlertsClosedContent = ({ activeAlertCount }: { activeAlertCount?: number }) => {
  const shouldRenderAlertsClosedContent = typeof activeAlertCount === 'number';
  const { euiTheme } = useEuiTheme();

  if (!shouldRenderAlertsClosedContent) {
    return null;
  }

  if (activeAlertCount > 0) {
    return (
      <EuiBadge color={euiTheme.colors.dangerText}>
        <EuiIcon type="warning" ascent={10} />
        &nbsp;
        {activeAlertCount}
      </EuiBadge>
    );
  }

  return (
    <span data-test-subj="infraAssetDetailsAlertsClosedContentNoAlerts">
      {i18n.translate('xpack.infra.assetDetails.noActiveAlertsContentClosedSection', {
        defaultMessage: 'No active alerts',
      })}
    </span>
  );
};
