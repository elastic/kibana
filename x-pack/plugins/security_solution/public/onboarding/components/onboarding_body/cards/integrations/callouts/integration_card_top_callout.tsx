/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useOnboardingService } from '../../../../../hooks/use_onboarding_service';
import { AgentlessAvailableCallout } from './agentless_available_callout';
import { InstalledIntegrationsCallout } from './installed_integrations_callout';
import { IntegrationTabId } from '../types';
import { EndpointCallout } from './endpoint_callout';

export const IntegrationCardTopCallout = React.memo(
  ({
    installedIntegrationsCount,
    isAgentRequired,
    selectedTabId,
  }: {
    installedIntegrationsCount: number;
    isAgentRequired: boolean;
    selectedTabId: IntegrationTabId;
  }) => {
    const { isAgentlessAvailable$ } = useOnboardingService();
    const isAgentlessAvailable = useObservable(isAgentlessAvailable$, undefined);

    const showAgentlessCallout =
      isAgentlessAvailable &&
      installedIntegrationsCount === 0 &&
      selectedTabId !== IntegrationTabId.endpoint;
    const showEndpointCallout =
      installedIntegrationsCount === 0 && selectedTabId === IntegrationTabId.endpoint;
    const showInstalledCallout = installedIntegrationsCount > 0 || isAgentRequired;

    return (
      <>
        {showEndpointCallout && <EndpointCallout />}
        {showAgentlessCallout && <AgentlessAvailableCallout />}
        {showInstalledCallout && (
          <InstalledIntegrationsCallout
            isAgentRequired={isAgentRequired}
            installedIntegrationsCount={installedIntegrationsCount}
          />
        )}
      </>
    );
  }
);

IntegrationCardTopCallout.displayName = 'IntegrationCardTopCallout';
