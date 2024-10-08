/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useObservable } from 'react-use';

import { useOnboardingService } from '../../../../../hooks/use_onboarding_service';
import { AGENTLESS_LEARN_MORE_LINK } from '../constants';
import { AgentlessAvailableCallout } from './agentless_available_callout';
import { InstalledIntegrationsCallout } from './installed_integrations_callout';

export const IntegrationCardTopCallout = React.memo(
  ({
    installedIntegrationsCount,
    isAgentRequired,
  }: {
    installedIntegrationsCount: number;
    isAgentRequired: boolean;
  }) => {
    const { isAgentlessAvailable$ } = useOnboardingService();
    const isAgentlessAvailable = useObservable(isAgentlessAvailable$, undefined);
    const showAgentlessCallout =
      isAgentlessAvailable && AGENTLESS_LEARN_MORE_LINK && installedIntegrationsCount === 0;
    const showInstalledCallout = installedIntegrationsCount > 0 || isAgentRequired;

    return (
      <>
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
