/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SloStatus } from '../../../../common/service_inventory';

/** SLO badge color by status (same as SloStatusBadge). */
const SLO_STATUS_COLOR: Record<
  SloStatus | 'noSLOs',
  'danger' | 'warning' | 'success' | 'default' | 'hollow'
> = {
  violated: 'danger',
  degrading: 'warning',
  noData: 'default',
  healthy: 'success',
  noSLOs: 'hollow',
};

export interface ServiceNodeBadgesProps {
  serviceName: string;
  alertsCount?: number;
  sloCount?: number;
  sloStatus?: SloStatus;
}

export const ServiceNodeBadges = memo(
  ({ serviceName: _serviceName, alertsCount, sloCount, sloStatus }: ServiceNodeBadgesProps) => {
    const showAlerts = (alertsCount ?? 0) > 0;
    const showSlo = (sloCount ?? 0) > 0;

    if (!showAlerts && !showSlo) {
      return null;
    }

    const sloColor = sloStatus !== undefined ? SLO_STATUS_COLOR[sloStatus] : 'hollow';

    return (
      <>
        {showAlerts && (
          <EuiToolTip
            position="bottom"
            content={i18n.translate('xpack.apm.serviceMap.serviceNode.alertsTooltip', {
              defaultMessage: 'Active alerts',
            })}
          >
            <EuiBadge
              data-test-subj="serviceMapNodeAlertsBadge"
              iconType="warning"
              color="danger"
              tabIndex={0}
            >
              {alertsCount}
            </EuiBadge>
          </EuiToolTip>
        )}
        {showSlo && (
          <EuiToolTip
            position="bottom"
            content={i18n.translate('xpack.apm.serviceMap.serviceNode.sloTooltip', {
              defaultMessage: 'SLOs',
            })}
          >
            <EuiBadge
              data-test-subj="serviceMapNodeSloBadge"
              iconType="visGauge"
              color={sloColor}
              tabIndex={0}
            >
              {sloCount}
            </EuiBadge>
          </EuiToolTip>
        )}
      </>
    );
  }
);

ServiceNodeBadges.displayName = 'ServiceNodeBadges';
