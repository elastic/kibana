/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { AgentRequiredCallout } from './agent_required_callout';
import { ManageIntegrationsCallout } from './manage_integrations_callout';

export const InstalledIntegrationsCallout = React.memo(
  ({
    installedIntegrationsCount,
    isAgentRequired,
  }: {
    installedIntegrationsCount: number;
    isAgentRequired: boolean;
  }) => {
    if (!installedIntegrationsCount) {
      return null;
    }

    return isAgentRequired ? (
      <AgentRequiredCallout />
    ) : (
      <ManageIntegrationsCallout installedIntegrationsCount={installedIntegrationsCount} />
    );
  }
);

InstalledIntegrationsCallout.displayName = 'InstalledIntegrationsCallout';
