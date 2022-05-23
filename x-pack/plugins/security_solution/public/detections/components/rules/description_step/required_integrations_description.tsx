/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiIconTip } from '@elastic/eui';
import { INTEGRATIONS_INSTALLED_VERSION_TOOLTIP } from '../../../pages/detection_engine/rules/translations';
import { useInstalledIntegrations } from '../../../containers/detection_engine/rules/use_installed_integrations';
import {
  getInstalledRelatedIntegrations,
  getIntegrationLink,
} from '../../../../common/components/integrations_popover/helpers';

import {
  RelatedIntegration,
  RelatedIntegrationArray,
} from '../../../../../common/detection_engine/schemas/common';
import { useBasePath } from '../../../../common/lib/kibana';
import { ListItems } from './types';
import * as i18n from './translations';

const Wrapper = styled.div`
  overflow: hidden;
`;

const IntegrationDescriptionComponent: React.FC<{ integration: RelatedIntegration }> = ({
  integration,
}) => {
  const basePath = useBasePath();
  const badgeInstalledColor = '#E0E5EE';
  const badgeUninstalledColor = 'accent';
  const { data } = useInstalledIntegrations({ packages: [] });

  const allInstalledIntegrations: RelatedIntegrationArray = data ?? [];
  const { availableIntegrations, installedRelatedIntegrations } = getInstalledRelatedIntegrations(
    [integration],
    allInstalledIntegrations
  );

  if (availableIntegrations.length > 0) {
    return (
      <Wrapper>
        {getIntegrationLink(integration, basePath)}{' '}
        {data != null && (
          <EuiBadge color={badgeUninstalledColor}>{i18n.RELATED_INTEGRATIONS_UNINSTALLED}</EuiBadge>
        )}
      </Wrapper>
    );
  } else if (installedRelatedIntegrations.length > 0) {
    return (
      <Wrapper>
        {getIntegrationLink(integration, basePath)}{' '}
        <EuiBadge color={badgeInstalledColor}>{i18n.RELATED_INTEGRATIONS_INSTALLED}</EuiBadge>
        {!installedRelatedIntegrations[0]?.versionSatisfied && (
          <EuiIconTip
            type="alert"
            content={INTEGRATIONS_INSTALLED_VERSION_TOOLTIP(
              installedRelatedIntegrations[0]?.version,
              installedRelatedIntegrations[0]?.targetVersion
            )}
            position="right"
          />
        )}
      </Wrapper>
    );
  } else {
    return <></>;
  }
};

export const IntegrationDescription = React.memo(IntegrationDescriptionComponent);

const RelatedIntegrationsDescription: React.FC<{ integrations: RelatedIntegrationArray }> = ({
  integrations,
}) => (
  <>
    {integrations?.map((integration, index) => (
      <IntegrationDescription key={`${integration.package}-${index}`} integration={integration} />
    ))}
  </>
);

export const buildRelatedIntegrationsDescription = (
  label: string,
  relatedIntegrations: RelatedIntegrationArray
): ListItems[] => [
  {
    title: label,
    description: <RelatedIntegrationsDescription integrations={relatedIntegrations} />,
  },
];
