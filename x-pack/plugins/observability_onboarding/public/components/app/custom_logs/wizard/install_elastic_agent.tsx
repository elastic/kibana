/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Buffer } from 'buffer';
import { flatten, zip } from 'lodash';
import React, { useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiSteps,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

type ElasticAgentPlatform = 'linux-tar' | 'macos' | 'windows';
export function InstallElasticAgent() {
  const { goToStep, goBack, getState, CurrentStep } = useWizard();
  const wizardState = getState();
  const [elasticAgentPlatform, setElasticAgentPlatform] =
    useState<ElasticAgentPlatform>('linux-tar');

  function onContinue() {
    goToStep('collectLogs');
  }

  function onBack() {
    goBack();
  }

  const { data: installShipperSetup, status: installShipperSetupStatus } =
    useFetcher((callApi) => {
      if (CurrentStep === InstallElasticAgent) {
        return callApi(
          'POST /internal/observability_onboarding/custom_logs/install_shipper_setup',
          {
            params: {
              body: {
                name: wizardState.datasetName,
                state: {
                  datasetName: wizardState.datasetName,
                  namespace: wizardState.namespace,
                  customConfigurations: wizardState.customConfigurations,
                  logFilePaths: wizardState.logFilePaths,
                },
              },
            },
          }
        );
      }
    }, []);

  const { data: yamlConfig = '', status: yamlConfigStatus } = useFetcher(
    (callApi) => {
      if (CurrentStep === InstallElasticAgent && installShipperSetup) {
        return callApi(
          'GET /api/observability_onboarding/elastic_agent/config 2023-05-24',
          {
            headers: {
              authorization: `ApiKey ${installShipperSetup.apiKeyEncoded}`,
            },
          }
        );
      }
    },
    [installShipperSetup?.apiKeyId, installShipperSetup?.apiKeyEncoded]
  );

  const apiKeyEncoded = installShipperSetup?.apiKeyEncoded;

  return (
    <StepPanel title="Install shipper to collect data">
      <StepPanelContent>
        <EuiText color="subdued">
          <p>
            Add Elastic Agent to your hosts to begin sending data to your
            Elastic Cloud. Run standalone if you want to download and manage
            each agent configuration file on your own, or enroll in Fleet, for
            centralized management of all your agents through our Fleet managed
            interface.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSteps
          steps={[
            {
              title: 'Install the Elastic Agent',
              status:
                installShipperSetupStatus === FETCH_STATUS.LOADING
                  ? 'loading'
                  : 'current',
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      Select a platform and run the command to install in your
                      Terminal, enroll, and start the Elastic Agent. Do this for
                      each host. For other platforms, see our downloads page.
                      Review host requirements and other installation options.
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiButtonGroup
                    isFullWidth
                    legend="Choose platform"
                    options={[
                      { id: 'linux-tar', label: 'Linux' },
                      { id: 'macos', label: 'MacOs', isDisabled: true },
                      { id: 'windows', label: 'Windows', isDisabled: true },
                    ]}
                    type="single"
                    idSelected={elasticAgentPlatform}
                    onChange={(id: string) =>
                      setElasticAgentPlatform(id as typeof elasticAgentPlatform)
                    }
                  />
                  <EuiSpacer size="m" />
                  <EuiSkeletonRectangle
                    isLoading={
                      installShipperSetupStatus === FETCH_STATUS.LOADING
                    }
                    contentAriaLabel="Command to install elastic agent"
                    width="100%"
                    height={80}
                    borderRadius="s"
                  >
                    <EuiCodeBlock language="bash" isCopyable>
                      {getInstallShipperCommand({
                        elasticAgentPlatform,
                        apiKeyEncoded,
                        apiEndpoint: installShipperSetup?.apiEndpoint,
                        scriptDownloadUrl:
                          installShipperSetup?.scriptDownloadUrl,
                      })}
                    </EuiCodeBlock>
                  </EuiSkeletonRectangle>
                </>
              ),
            },
            {
              title: 'Configure the agent',
              status:
                yamlConfigStatus === FETCH_STATUS.LOADING
                  ? 'loading'
                  : 'incomplete',
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      Copy the config below to the elastic agent.yml on the host
                      where the Elastic Agent is installed.
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiSkeletonRectangle
                    isLoading={yamlConfigStatus === FETCH_STATUS.LOADING}
                    contentAriaLabel="Elastic agent yaml configuration"
                    width="100%"
                    height={300}
                    borderRadius="s"
                  >
                    <EuiCodeBlock language="yaml" isCopyable>
                      {yamlConfig}
                    </EuiCodeBlock>
                  </EuiSkeletonRectangle>
                  <EuiSpacer size="m" />
                  <EuiButton
                    iconType="download"
                    color="primary"
                    href={`data:application/yaml;base64,${Buffer.from(
                      yamlConfig,
                      'utf8'
                    ).toString('base64')}`}
                    download="elastic-agent.yml"
                    target="_blank"
                  >
                    Download config file
                  </EuiButton>
                </>
              ),
            },
          ]}
        />
      </StepPanelContent>
      <StepPanelFooter
        items={[
          <EuiButton color="ghost" fill onClick={onBack}>
            Back
          </EuiButton>,
          <EuiButton color="primary" fill onClick={onContinue}>
            Continue
          </EuiButton>,
        ]}
      />
    </StepPanel>
  );
}

function getInstallShipperCommand({
  elasticAgentPlatform,
  apiKeyEncoded = '$API_KEY',
  apiEndpoint = '$API_ENDPOINT',
  scriptDownloadUrl = '$SCRIPT_DOWNLOAD_URL',
}: {
  elasticAgentPlatform: ElasticAgentPlatform;
  apiKeyEncoded: string | undefined;
  apiEndpoint: string | undefined;
  scriptDownloadUrl: string | undefined;
}) {
  const setupScriptFilename = 'standalone_agent_setup.sh';
  const PLATFORM_COMMAND: Record<ElasticAgentPlatform, string> = {
    'linux-tar': oneLine`
      curl ${scriptDownloadUrl} -o ${setupScriptFilename} &&
      sudo bash ${setupScriptFilename} ${apiKeyEncoded} ${apiEndpoint}
    `,
    macos: oneLine`
      curl -O https://elastic.co/agent-setup.sh &&
      sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==
    `,
    windows: oneLine`
      curl -O https://elastic.co/agent-setup.sh &&
      sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==
    `,
  };
  return PLATFORM_COMMAND[elasticAgentPlatform];
}

function oneLine(parts: TemplateStringsArray, ...args: string[]) {
  const str = flatten(zip(parts, args)).join('');
  return str.replace(/\s+/g, ' ').trim();
}
