/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';

const FleetOverviewLinkComponent = () => (
  <EuiButton
    href="https://www.elastic.co/guide/en/fleet/current/fleet-overview.html"
    target="_blank"
  >
    <FormattedMessage
      id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1.description1.linkText"
      defaultMessage="Go here to learn more!"
    />
  </EuiButton>
);

export const FleetOverviewLink = React.memo(FleetOverviewLinkComponent);
