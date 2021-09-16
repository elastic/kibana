/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiText } from '@elastic/eui';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { useTheme } from '../../../hooks/use_theme';

interface Props {
  alertStatus: typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED;
}

export function AlertStatusIndicator({ alertStatus }: Props) {
  const theme = useTheme();

  if (alertStatus === ALERT_STATUS_ACTIVE) {
    return (
      <EuiHealth color="primary" textSize="xs">
        {i18n.translate('xpack.observability.alertsTGrid.statusActiveDescription', {
          defaultMessage: 'Active',
        })}
      </EuiHealth>
    );
  }

  return (
    <EuiHealth color={theme.eui.euiColorLightShade} textSize="xs">
      <EuiText color="subdued" size="relative">
        {i18n.translate('xpack.observability.alertsTGrid.statusRecoveredDescription', {
          defaultMessage: 'Recovered',
        })}
      </EuiText>
    </EuiHealth>
  );
}
