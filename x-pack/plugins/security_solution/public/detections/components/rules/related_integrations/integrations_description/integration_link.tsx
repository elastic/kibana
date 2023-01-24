/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useBasePath } from '../../../../../common/lib/kibana';
import type { IntegrationDetails } from '../integration_details';

interface IntegrationLinkProps {
  integration: IntegrationDetails;
}

const IntegrationLinkComponent: React.FC<IntegrationLinkProps> = ({ integration }) => {
  const basePath = useBasePath();
  const linkText = integration.integrationTitle;
  const linkUrl = `${basePath}/${integration.targetUrl}`;

  return (
    <EuiLink href={linkUrl} target="_blank" data-test-subj={'integrationLink'}>
      {linkText}
    </EuiLink>
  );
};

/**
 * Renders an `EuiLink` that will link to a given package/integration/version page within fleet.
 */
export const IntegrationLink = React.memo(IntegrationLinkComponent);
IntegrationLink.displayName = 'IntegrationLink';
