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
} from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';
import { useFetcher } from '../../../../hooks/use_fetcher';
// import { useKibana } from '@kbn/kibana-react-plugin/public';
// import type { CloudSetup } from '@kbn/cloud-plugin/public';

type ElasticAgentPlatform = 'linux-tar' | 'macos' | 'windows';
export function InstallElasticAgent() {
  const { goToStep, goBack, getState } = useWizard();
  const wizardState = getState();
  const [elasticAgentPlatform, setElasticAgentPlatform] =
    useState<ElasticAgentPlatform>('linux-tar');

  function onContinue() {
    goToStep('collectLogs');
  }

  function onBack() {
    goBack();
  }

  const { data: installShipperSetup } = useFetcher((callApi) => {
    return callApi(
      'POST /internal/observability_onboarding/custom_logs/install_shipper_setup',
      { params: { body: { name: wizardState.datasetName } } }
    );
  }, []);

  const apiKeyEncoded = installShipperSetup?.apiKeyEncoded;
  const esHost = installShipperSetup?.esHost;

  // const { services } = useKibana<{ cloud?: CloudSetup }>();
  // const isCloudEnabled = !!services?.cloud?.isCloudEnabled;
  // const baseUrl = services?.cloud?.baseUrl;
  // console.log(services);
  // console.log(services.http?.getServerInfo());

  const elasticAgentYaml = getElasticAgentYaml({
    esHost,
    apiKeyEncoded,
    logfileId: 'custom-logs-abcdefgh',
    logfileNamespace: 'default',
    logfileStreams: [
      {
        id: 'logs-onboarding-demo-app',
        dataset: 'demo1',
        path: '/home/oliver/github/logs-onboarding-demo-app/combined.log',
      },
      // {
      //   id: 'logfileStream-abcd1234',
      //   dataset: 'nginxaccess',
      //   path: '/var/log/nginx/access.log',
      // },
      // {
      //   id: 'logfileStream-efgh5678',
      //   dataset: 'nginxerror',
      //   path: '/var/log/nginx/error.log',
      // },
    ],
  });

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
              status: 'current',
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
                  <EuiCodeBlock language="bash" isCopyable>
                    {getInstallShipperCommand({
                      elasticAgentPlatform,
                      apiKeyEncoded,
                      statusApiEndpoint: installShipperSetup?.statusApiEndpoint,
                      scriptDownloadUrl: installShipperSetup?.scriptDownloadUrl,
                    })}
                  </EuiCodeBlock>
                </>
              ),
            },
            {
              title: 'Configure the agent',
              status: 'incomplete',
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      Copy the config below to the elastic agent.yml on the host
                      where the Elastic Agent is installed.
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiCodeBlock language="yaml" isCopyable>
                    {elasticAgentYaml}
                  </EuiCodeBlock>
                  <EuiSpacer size="m" />
                  <EuiButton
                    iconType="download"
                    color="primary"
                    href={`data:application/yaml;base64,${Buffer.from(
                      elasticAgentYaml,
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
  statusApiEndpoint = '$STATUS_API_ENDPOINT',
  scriptDownloadUrl = '$SCRIPT_DOWNLOAD_URL',
}: {
  elasticAgentPlatform: ElasticAgentPlatform;
  apiKeyEncoded: string | undefined;
  statusApiEndpoint: string | undefined;
  scriptDownloadUrl: string | undefined;
}) {
  const setupScriptFilename = 'standalone-agent-setup.sh';
  const PLATFORM_COMMAND: Record<ElasticAgentPlatform, string> = {
    'linux-tar': oneLine`
      curl ${scriptDownloadUrl} -o ${setupScriptFilename} &&
      sudo bash ${setupScriptFilename} ${apiKeyEncoded} ${statusApiEndpoint}
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

function getElasticAgentYaml({
  esHost = '$ES_HOST',
  apiKeyEncoded = '$API_KEY',
  logfileId,
  logfileNamespace,
  logfileStreams,
}: {
  esHost: string | undefined;
  apiKeyEncoded: string | undefined;
  logfileId: string;
  logfileNamespace: string;
  logfileStreams: Array<{ id: string; dataset: string; path: string }>;
}) {
  const apiKeyBeats = Buffer.from(apiKeyEncoded, 'base64').toString('utf8');
  return `
outputs:
  default:
    type: elasticsearch
    hosts:
      - '${esHost}'
    api_key: ${apiKeyBeats}

inputs:
  - id: ${logfileId}
    type: logfile
    data_stream:
      namespace: ${logfileNamespace}
    streams:
${logfileStreams
  .map(
    ({ id, dataset, path }) => `      - id: ${id}
        data_stream:
          dataset: ${dataset}
        paths:
          - ${path}`
  )
  .join('\n')}`.trim();
}
