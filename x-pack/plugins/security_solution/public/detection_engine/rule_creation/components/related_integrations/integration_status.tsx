/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface IntegrationStatusProps {
  isIntegrationInstalled: boolean;
  isIntegrationEnabled: boolean;
}

export function IntegrationStatus({
  isIntegrationInstalled,
  isIntegrationEnabled,
}: IntegrationStatusProps): JSX.Element {
  const color = isIntegrationEnabled ? 'success' : isIntegrationInstalled ? 'primary' : undefined;
  const statusText = isIntegrationEnabled
    ? 'Installed: Enabled'
    : isIntegrationInstalled
    ? 'Installed: Disabled'
    : 'Not installed';

  return <EuiBadge color={color}>{statusText}</EuiBadge>;
}
