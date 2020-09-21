/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import {
  getServiceHealthStatusColor,
  getServiceHealthStatusLabel,
  ServiceHealthStatus,
} from '../../../../../common/service_health_status';
import { useTheme } from '../../../../hooks/useTheme';

export function HealthBadge({
  healthStatus,
}: {
  healthStatus: ServiceHealthStatus;
}) {
  const theme = useTheme();

  return (
    <EuiBadge color={getServiceHealthStatusColor(theme, healthStatus)}>
      {getServiceHealthStatusLabel(healthStatus)}
    </EuiBadge>
  );
}
