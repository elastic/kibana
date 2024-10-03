/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useObservable } from 'react-use';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { AvailablePackages } from './available_packages';
import { useOnboardingService } from '../../../../hooks/use_onboarding_service';
import { AgentlessAvailableCallout } from './agentless_available_callout';
import { PackageInstalledCallout } from './packages_installed_callout';
import { AGENTLESS_LEARN_MORE_LINK } from './const';

export const IntegrationsCard: OnboardingCardComponent = ({
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  const integrationsInstalled: number = checkCompleteMetadata?.integrationsInstalled as number;

  const { isAgentlessAvailable$ } = useOnboardingService();
  const isAgentlessAvailable = useObservable(isAgentlessAvailable$, undefined);
  const showAgentlessCallout =
    isAgentlessAvailable && AGENTLESS_LEARN_MORE_LINK && integrationsInstalled === 0;
  const showInstalledCallout =
    integrationsInstalled > 0 || checkCompleteMetadata?.agentStillRequired;

  return (
    <OnboardingCardContentPanel>
      <>
        {showAgentlessCallout && <AgentlessAvailableCallout />}
        {showInstalledCallout && (
          <PackageInstalledCallout checkCompleteMetadata={checkCompleteMetadata} />
        )}
        {(showAgentlessCallout || showInstalledCallout) && <EuiSpacer size="m" />}
      </>
      <AvailablePackages />
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
