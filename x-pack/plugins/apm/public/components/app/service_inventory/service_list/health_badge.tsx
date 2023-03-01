/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import {
  getServiceHealthStatusBadgeColor,
  getServiceHealthStatusLabel,
  ServiceHealthStatus,
} from '../../../../../common/service_health_status';
import { useTheme } from '../../../../hooks/use_theme';

export function HealthBadge({
  healthStatus,
  onClick,
}: {
  healthStatus: ServiceHealthStatus;
  onClick: () => void;
}) {
  const theme = useTheme();

  return (
    <EuiBadge
      color={getServiceHealthStatusBadgeColor(theme, healthStatus)}
      onClick={onClick}
      onClickAriaLabel=""
      iconOnClick={onClick}
      iconOnClickAriaLabel=""
    >
      {getServiceHealthStatusLabel(healthStatus)}
    </EuiBadge>
  );
}
