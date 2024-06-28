/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSteps, EuiSpacer } from '@elastic/eui';
import { safeDump } from 'js-yaml';

import type { FullAgentPolicy } from '../../../../../../../../../../common/types/models/agent_policy';
import { API_VERSIONS } from '../../../../../../../../../../common/constants';
import { getRootIntegrations } from '../../../../../../../../../../common/services';
import {
  AgentStandaloneBottomBar,
  StandaloneModeWarningCallout,
  NotObscuredByBottomBar,
} from '../..';
import {
  fullAgentPolicyToYaml,
  agentPolicyRouteService,
} from '../../../../../../../../../services';

import { Error as FleetError } from '../../../../../../../components';
import {
  useKibanaVersion,
  useStartServices,
  sendGetOneAgentPolicyFull,
  sendCreateStandaloneAgentAPIKey,
} from '../../../../../../../../../hooks';
import {
  InstallStandaloneAgentStep,
  ConfigureStandaloneAgentStep,
} from '../../../../../../../../../components/agent_enrollment_flyout/steps';
import { StandaloneInstructions } from '../../../../../../../../../components/enrollment_instructions';

import type { InstallAgentPageProps } from './types';

export const InstallElasticAgentStandalonePageStep: React.FC<InstallAgentPageProps> = (props) => {
  const { setIsManaged, agentPolicy, cancelUrl, onNext, cancelClickHandler } = props;
  const core = useStartServices();
  const kibanaVersion = useKibanaVersion();
  const [yaml, setYaml] = useState<any | undefined>('');
  const [commandCopied, setCommandCopied] = useState(false);
  const [policyCopied, setPolicyCopied] = useState(false);
  const [fullAgentPolicy, setFullAgentPolicy] = useState<FullAgentPolicy | undefined>();
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchFullPolicy() {
      try {
        if (!agentPolicy?.id) {
          return;
        }
        const query = { standalone: true, standalone_api_key: apiKey, kubernetes: false };
        const res = await sendGetOneAgentPolicyFull(agentPolicy?.id, query);
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching full agent policy');
        }
        setFullAgentPolicy(res.data.item);
      } catch (error) {
        core.notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
    }
    fetchFullPolicy();
  }, [core.http.basePath, agentPolicy?.id, core.notifications.toasts, apiKey]);

  useEffect(() => {
    if (!fullAgentPolicy) {
      return;
    }

    setYaml(fullAgentPolicyToYaml(fullAgentPolicy, safeDump));
  }, [fullAgentPolicy]);

  const onCreateApiKey = useCallback(async () => {
    const res = await sendCreateStandaloneAgentAPIKey({
      name: crypto.randomBytes(16).toString('hex'),
    });
    if (res.error) {
      throw res.error;
    }
    const newApiKey = `${res.data?.item.id}:${res.data?.item.api_key}`;
    setApiKey(newApiKey);
  }, []);

  if (!agentPolicy) {
    return (
      <FleetError
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={'Agent policy not provided'}
      />
    );
  }

  const installManagedCommands = StandaloneInstructions(kibanaVersion);

  const downloadLink = core.http.basePath.prepend(
    `${agentPolicyRouteService.getInfoFullDownloadPath(
      agentPolicy?.id
    )}?standalone=true&apiVersion=${API_VERSIONS.public.v1}`
  );
  const steps = [
    ConfigureStandaloneAgentStep({
      selectedPolicyId: agentPolicy?.id,
      yaml,
      downloadLink,
      apiKey,
      onCreateApiKey,
      isComplete: policyCopied,
      onCopy: () => setPolicyCopied(true),
    }),
    InstallStandaloneAgentStep({
      installCommand: installManagedCommands,
      isComplete: yaml && commandCopied,
      fullCopyButton: true,
      onCopy: () => setCommandCopied(true),
      rootIntegrations: getRootIntegrations(agentPolicy?.package_policies ?? []),
    }),
  ];

  return (
    <>
      <StandaloneModeWarningCallout setIsManaged={setIsManaged} />
      <EuiSpacer size="xl" />
      <EuiSteps steps={steps} />
      {commandCopied && (
        <>
          <NotObscuredByBottomBar />
          <AgentStandaloneBottomBar
            cancelUrl={cancelUrl}
            onNext={onNext}
            cancelClickHandler={cancelClickHandler}
          />
        </>
      )}
    </>
  );
};
