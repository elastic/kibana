/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiText } from '@elastic/eui';
import { ALERT_STATUS_ACTIVE, AlertStatus } from '@kbn/rule-data-utils';
import { LIGHT_THEME } from '@elastic/charts';

interface AlertStatusIndicatorProps {
  alertStatus: AlertStatus;
  textSize?: 'xs' | 's' | 'm' | 'inherit';
}

export function AlertStatusIndicator({ alertStatus, textSize = 'xs' }: AlertStatusIndicatorProps) {
  if (alertStatus === ALERT_STATUS_ACTIVE) {
    return (
      <EuiHealth color={LIGHT_THEME.colors.vizColors[2]} textSize={textSize}>
        {i18n.translate('xpack.observability.alertsTGrid.statusActiveDescription', {
          defaultMessage: 'Active',
        })}
      </EuiHealth>
    );
  }

  return (
    <EuiHealth color={LIGHT_THEME.colors.vizColors[1]} textSize={textSize}>
      <EuiText color="subdued" size="relative">
        {i18n.translate('xpack.observability.alertsTGrid.statusRecoveredDescription', {
          defaultMessage: 'Recovered',
        })}
      </EuiText>
    </EuiHealth>
  );
}
