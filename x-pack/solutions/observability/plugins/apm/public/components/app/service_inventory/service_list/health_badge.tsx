/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import type { ServiceHealthStatus } from '../../../../../common/service_health_status';
import {
  getServiceHealthStatusBadgeColor,
  getServiceHealthStatusLabel,
} from '../../../../../common/service_health_status';

export function HealthBadge({ healthStatus }: { healthStatus: ServiceHealthStatus }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge color={getServiceHealthStatusBadgeColor(euiTheme, healthStatus)}>
      {getServiceHealthStatusLabel(healthStatus)}
    </EuiBadge>
  );
}
