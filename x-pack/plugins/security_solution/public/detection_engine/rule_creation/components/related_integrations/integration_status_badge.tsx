/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import * as i18n from './translations';

interface IntegrationStatusBadgeProps {
  isInstalled: boolean;
  isEnabled: boolean;
}

export function IntegrationStatusBadge({
  isInstalled,
  isEnabled,
}: IntegrationStatusBadgeProps): JSX.Element {
  const color = isEnabled ? 'success' : isInstalled ? 'primary' : undefined;
  const statusText = isEnabled
    ? i18n.INTEGRATION_INSTALLED_AND_ENABLED
    : isInstalled
    ? i18n.INTEGRATION_INSTALLED_AND_DISABLED
    : i18n.INTEGRATION_NOT_INSTALLED;

  return (
    <EuiBadge color={color} data-test-subj="statusBadge">
      {statusText}
    </EuiBadge>
  );
}
