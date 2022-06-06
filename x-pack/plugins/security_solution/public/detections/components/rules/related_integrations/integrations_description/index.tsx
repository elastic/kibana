/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiIconTip, EuiToolTip } from '@elastic/eui';
import { useInstalledIntegrations } from '../use_installed_integrations';
import { getInstalledRelatedIntegrations, getIntegrationLink, IntegrationDetails } from '../utils';

import { RelatedIntegrationArray } from '../../../../../../common/detection_engine/schemas/common';
import { useBasePath } from '../../../../../common/lib/kibana';
import { ListItems } from '../../description_step/types';
import * as i18n from '../translations';

const Wrapper = styled.div`
  overflow: hidden;
`;

const PaddedBadge = styled(EuiBadge)`
  margin-left: 5px;
`;

const VersionWarningIcon = styled(EuiIconTip)`
  margin-left: 5px;
`;

export const IntegrationDescriptionComponent: React.FC<{ integration: IntegrationDetails }> = ({
  integration,
}) => {
  const basePath = useBasePath();
  const badgeInstalledColor = 'success';
  const badgeUninstalledColor = '#E0E5EE';
  const badgeColor = integration.is_installed ? badgeInstalledColor : badgeUninstalledColor;
  const badgeTooltip = integration.is_installed
    ? integration.is_enabled
      ? i18n.INTEGRATIONS_ENABLED_TOOLTIP
      : i18n.INTEGRATIONS_INSTALLED_TOOLTIP
    : i18n.INTEGRATIONS_UNINSTALLED_TOOLTIP;
  const badgeText = integration.is_installed
    ? integration.is_enabled
      ? i18n.INTEGRATIONS_ENABLED
      : i18n.INTEGRATIONS_INSTALLED
    : i18n.INTEGRATIONS_UNINSTALLED;

  return (
    <Wrapper>
      {getIntegrationLink(integration, basePath)}{' '}
      <EuiToolTip content={badgeTooltip}>
        <PaddedBadge color={badgeColor}>{badgeText}</PaddedBadge>
      </EuiToolTip>
      {integration.is_installed && !integration.version_satisfied && (
        <VersionWarningIcon
          type={'alert'}
          color={'yellow'}
          content={i18n.INTEGRATIONS_INSTALLED_VERSION_TOOLTIP(
            integration.package_version,
            integration.target_version
          )}
          position={'right'}
        />
      )}
    </Wrapper>
  );
};

export const IntegrationDescription = React.memo(IntegrationDescriptionComponent);

export const RelatedIntegrationsDescription: React.FC<{
  integrations: RelatedIntegrationArray;
}> = ({ integrations }) => {
  const { data: allInstalledIntegrations } = useInstalledIntegrations({ packages: [] });

  const integrationDetails = getInstalledRelatedIntegrations(
    integrations,
    allInstalledIntegrations
  );

  return (
    <>
      {integrationDetails.map((integration, index) => (
        <IntegrationDescription
          key={`${integration.package_name}-${index}`}
          integration={integration}
        />
      ))}
    </>
  );
};

export const buildRelatedIntegrationsDescription = (
  label: string,
  relatedIntegrations: RelatedIntegrationArray | undefined
): ListItems[] => {
  if (relatedIntegrations == null || relatedIntegrations.length === 0) {
    return [];
  }

  return [
    {
      title: label,
      description: <RelatedIntegrationsDescription integrations={relatedIntegrations} />,
    },
  ];
};
