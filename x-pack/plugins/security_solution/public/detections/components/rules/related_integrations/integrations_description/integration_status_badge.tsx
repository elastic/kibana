/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

import type { IntegrationDetails } from '../integration_details';
import * as i18n from '../translations';

const PaddedBadge = styled(EuiBadge)`
  margin-left: 5px;
`;

interface IntegrationStatusBadgeProps {
  integration: IntegrationDetails;
}

const IntegrationStatusBadgeComponent: React.FC<IntegrationStatusBadgeProps> = ({
  integration,
}) => {
  const { installationStatus } = integration;

  if (!installationStatus.isKnown) {
    return null;
  }

  const { isInstalled, isEnabled } = installationStatus;

  const badgeInstalledColor = 'success';
  const badgeUninstalledColor = '#E0E5EE';
  const badgeColor = isInstalled ? badgeInstalledColor : badgeUninstalledColor;

  const badgeTooltip = isInstalled
    ? isEnabled
      ? i18n.INTEGRATIONS_ENABLED_TOOLTIP
      : i18n.INTEGRATIONS_INSTALLED_TOOLTIP
    : i18n.INTEGRATIONS_UNINSTALLED_TOOLTIP;

  const badgeText = isInstalled
    ? isEnabled
      ? i18n.INTEGRATIONS_ENABLED
      : i18n.INTEGRATIONS_INSTALLED
    : i18n.INTEGRATIONS_UNINSTALLED;

  return (
    <EuiToolTip content={badgeTooltip}>
      <PaddedBadge color={badgeColor} data-test-subj={'statusBadge'}>
        {badgeText}
      </PaddedBadge>
    </EuiToolTip>
  );
};

export const IntegrationStatusBadge = React.memo(IntegrationStatusBadgeComponent);
IntegrationStatusBadge.displayName = 'IntegrationStatusBadge';
