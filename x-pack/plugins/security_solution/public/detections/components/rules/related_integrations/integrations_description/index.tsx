/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import type { RelatedIntegrationArray } from '../../../../../../common/detection_engine/rule_schema';
import type { ListItems } from '../../description_step/types';
import type { IntegrationDetails } from '../integration_details';
import { useRelatedIntegrations } from '../use_related_integrations';

import { IntegrationLink } from './integration_link';
import { IntegrationStatusBadge } from './integration_status_badge';
import { IntegrationVersionMismatchIcon } from './integration_version_mismatch_icon';

const Wrapper = styled.div`
  overflow: hidden;
`;

export const IntegrationDescriptionComponent: React.FC<{ integration: IntegrationDetails }> = ({
  integration,
}) => {
  return (
    <Wrapper>
      <IntegrationLink integration={integration} />{' '}
      <IntegrationStatusBadge integration={integration} />
      <IntegrationVersionMismatchIcon integration={integration} />
    </Wrapper>
  );
};

export const IntegrationDescription = React.memo(IntegrationDescriptionComponent);

export const RelatedIntegrationsDescription: React.FC<{
  relatedIntegrations: RelatedIntegrationArray;
}> = ({ relatedIntegrations }) => {
  const { integrations } = useRelatedIntegrations(relatedIntegrations);

  return (
    <>
      {integrations.map((integration, index) => (
        <IntegrationDescription
          key={`${integration.packageName}-${index}`}
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
      description: <RelatedIntegrationsDescription relatedIntegrations={relatedIntegrations} />,
    },
  ];
};
