/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiIconTip } from '@elastic/eui';
import type { IntegrationDetails } from '../integration_details';
import * as i18n from '../translations';

const VersionWarningIconContainer = styled.span`
  margin-left: 5px;
`;

interface IntegrationVersionMismatchIconProps {
  integration: IntegrationDetails;
}

const IntegrationVersionMismatchIconComponent: React.FC<IntegrationVersionMismatchIconProps> = ({
  integration,
}) => {
  const { installationStatus } = integration;

  if (
    !installationStatus.isKnown ||
    !installationStatus.isInstalled ||
    !installationStatus.isVersionMismatch
  ) {
    return null;
  }

  return (
    <VersionWarningIconContainer>
      <EuiIconTip
        type={'alert'}
        color={'warning'}
        content={i18n.INTEGRATIONS_INSTALLED_VERSION_TOOLTIP(
          installationStatus.installedVersion,
          integration.requiredVersion
        )}
      />
    </VersionWarningIconContainer>
  );
};

export const IntegrationVersionMismatchIcon = React.memo(IntegrationVersionMismatchIconComponent);
IntegrationVersionMismatchIcon.displayName = 'IntegrationVersionMismatchIcon';
