/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

export const AlertsClosedContent = ({ activeAlertCount }: { activeAlertCount?: number }) => {
  const shouldRenderAlertsClosedContent = typeof activeAlertCount === 'number';

  if (!shouldRenderAlertsClosedContent) {
    return null;
  }

  if (activeAlertCount > 0) {
    return (
      <span data-test-subj="infraAssetDetailsAlertsClosedContentWithAlerts">
        {i18n.translate('xpack.infra.assetDetails.activeAlertsContentClosedSection', {
          defaultMessage:
            ' {activeAlertCount} {activeAlertCount, plural, one {active alert} other {active alerts}}',
          values: { activeAlertCount },
        })}
      </span>
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
