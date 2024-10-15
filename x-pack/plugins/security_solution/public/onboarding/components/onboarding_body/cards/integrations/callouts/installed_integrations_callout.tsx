/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import { AgentRequiredCallout } from './agent_required_callout';
import { ManageIntegrationsCallout } from './manage_integrations_callout';
import { useToasts } from '../../../../../../common/lib/kibana';

export const InstalledIntegrationsCallout = React.memo(
  ({
    errorFetchAgentsData,
    installedIntegrationsCount,
    isAgentRequired,
  }: {
    errorFetchAgentsData: Error | undefined;
    installedIntegrationsCount: number;
    isAgentRequired: boolean;
  }) => {
    const toasts = useToasts();

    useEffect(() => {
      if (errorFetchAgentsData) {
        toasts.addError(errorFetchAgentsData, {
          title: i18n.translate('xpack.securitySolution.onboarding.fetchAgentsError', {
            defaultMessage: "Failed to check agents' status",
          }),
        });
      }
    }, [errorFetchAgentsData, toasts]);

    if (!installedIntegrationsCount) {
      return null;
    }

    return !isAgentRequired ? (
      <ManageIntegrationsCallout installedIntegrationsCount={installedIntegrationsCount} />
    ) : errorFetchAgentsData == null ? (
      <AgentRequiredCallout />
    ) : null;
  }
);

InstalledIntegrationsCallout.displayName = 'InstalledIntegrationsCallout';
