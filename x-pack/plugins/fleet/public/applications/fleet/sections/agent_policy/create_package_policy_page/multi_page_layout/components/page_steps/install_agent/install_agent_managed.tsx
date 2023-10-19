/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiLink, EuiSteps, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import { Error } from '../../../../../../../components';
import { useStartServices, useAgentVersion } from '../../../../../../../../../hooks';

import { CreatePackagePolicyBottomBar, NotObscuredByBottomBar } from '../..';
import {
  InstallManagedAgentStep,
  AgentEnrollmentConfirmationStep,
} from '../../../../../../../../../components/agent_enrollment_flyout/steps';
import { ManualInstructions } from '../../../../../../../../../components/enrollment_instructions';

import { KubernetesManifestApplyStep } from '../../../../../../../../../components/agent_enrollment_flyout/steps/run_k8s_apply_command_step';

import type { InstallAgentPageProps } from './types';

export const InstallElasticAgentManagedPageStep: React.FC<InstallAgentPageProps> = (props) => {
  const {
    cancelUrl,
    onNext,
    cancelClickHandler,
    setIsManaged,
    agentPolicy,
    enrollmentAPIKey,
    fleetServerHosts,
    fleetProxy,
    enrolledAgentIds,
  } = props;

  const core = useStartServices();
  const { docLinks } = core;
  const link = docLinks.links.fleet.troubleshooting;

  const agentVersion = useAgentVersion();

  const [commandCopied, setCommandCopied] = useState(false);
  const [applyCommandCopied, setApplyCommandCopied] = useState(false);

  if (!enrollmentAPIKey) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={'Enrollment API key not found'}
      />
    );
  }

  const isK8s =
    props.packageInfo.name === 'kubernetes' ? 'IS_KUBERNETES_MULTIPAGE' : 'IS_NOT_KUBERNETES';

  const installManagedCommands = ManualInstructions({
    apiKey: enrollmentAPIKey.api_key,
    fleetProxy,
    fleetServerHosts,
    agentVersion: agentVersion || '',
  });

  const steps = [
    InstallManagedAgentStep({
      installCommand: installManagedCommands,
      apiKeyData: { item: enrollmentAPIKey },
      enrollToken: enrollmentAPIKey.api_key,
      isK8s,
      selectedApiKeyId: enrollmentAPIKey.id,
      isComplete: commandCopied || !!enrolledAgentIds.length,
      fullCopyButton: true,
      fleetServerHost: fleetServerHosts?.[0],
      onCopy: () => setCommandCopied(true),
    }),
  ];

  if (isK8s === 'IS_KUBERNETES_MULTIPAGE') {
    steps.push(
      KubernetesManifestApplyStep({
        isComplete: applyCommandCopied || !!enrolledAgentIds.length,
        fullCopyButton: true,
        onCopy: () => setApplyCommandCopied(true),
      })
    );
  }

  steps.push(
    AgentEnrollmentConfirmationStep({
      selectedPolicyId: agentPolicy?.id,
      troubleshootLink: link,
      agentCount: enrolledAgentIds.length,
      showLoading: true,
      poll: commandCopied,
    })
  );

  if (!agentVersion) {
    return <EuiLoadingSpinner />;
  }

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.addIntegration.installAgentStepTitle"
          defaultMessage="These steps configure and enroll the Elastic Agent in Fleet to automatically deploy updates and
          centrally manage the agent. As an alternative to Fleet, advanced users can run agents in {standaloneLink}."
          values={{
            standaloneLink: <EuiLink onClick={() => setIsManaged(false)}>standalone mode</EuiLink>,
          }}
        />
      </EuiText>
      <EuiSpacer size={'xl'} />
      <EuiSteps steps={steps} />
      {!!enrolledAgentIds.length && (
        <>
          <NotObscuredByBottomBar />
          <CreatePackagePolicyBottomBar
            cancelUrl={cancelUrl}
            cancelClickHandler={cancelClickHandler}
            onNext={onNext}
            actionMessage={
              <FormattedMessage
                id="xpack.fleet.addFirstIntegrationSplash.addIntegrationButton"
                defaultMessage="Add the integration"
              />
            }
          />
        </>
      )}
    </>
  );
};
