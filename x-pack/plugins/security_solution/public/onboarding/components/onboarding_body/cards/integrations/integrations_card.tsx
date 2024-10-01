/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useObservable } from 'react-use';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { AvailablePackages } from './available_packages';
import { useNavigation } from '../../../../../common/lib/kibana';
import { useOnboardingService } from '../../../../hooks/use_onboarding_service';
import { AgentlessAvailableCallout } from './agentless_available_callout';
import { PackageInstalledCallout } from './packages_installed_callout';

export const IntegrationsCard: OnboardingCardComponent = ({
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  const integrationsInstalled: number = checkCompleteMetadata?.integrationsInstalled as number;

  const { isAgentlessAvailable$ } = useOnboardingService();
  const isAgentlessAvailable = useObservable(isAgentlessAvailable$, undefined);
  const { getAppUrl, navigateTo } = useNavigation();
  const addAgentLink = getAppUrl({ appId: 'fleet', path: '/agents' });
  const onAddAgentClick = useCallback(() => {
    navigateTo({ appId: 'fleet', path: '/agents' }); // to be confirmed
  }, [navigateTo]);
  return (
    <OnboardingCardContentPanel>
      {isAgentlessAvailable && integrationsInstalled === 0 && (
        <>
          <AgentlessAvailableCallout
            addAgentLink={addAgentLink}
            onAddAgentClick={onAddAgentClick}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {(integrationsInstalled > 0 || checkCompleteMetadata?.agentStillRequired) && (
        <>
          <PackageInstalledCallout
            addAgentLink={addAgentLink}
            onAddAgentClick={onAddAgentClick}
            checkCompleteMetadata={checkCompleteMetadata}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <AvailablePackages />
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
