/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Buffer } from 'buffer';
import { flatten, zip } from 'lodash';
import React, { useEffect, useState, useCallback } from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiSteps,
  EuiStepsProps,
  EuiSubSteps,
  EuiStep,
  EuiSkeletonRectangle,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useKibanaNavigation } from '../../../../hooks/use_kibana_navigation';
import { useWizard } from '.';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

type ElasticAgentPlatform = 'linux-tar' | 'macos' | 'windows';
export function InstallElasticAgent() {
  const { navigateToKibanaUrl } = useKibanaNavigation();
  const { goBack, goToStep, getState, setState, CurrentStep } = useWizard();
  const wizardState = getState();
  const [elasticAgentPlatform, setElasticAgentPlatform] =
    useState<ElasticAgentPlatform>('linux-tar');

  function onInspect() {
    goToStep('inspect');
  }
  function onContinue() {
    navigateToKibanaUrl('/app/logs/stream');
  }

  function onBack() {
    goBack();
  }

  function onAutoDownloadConfig() {
    const { autoDownloadConfig, ...state } = getState();
    setState({ ...state, autoDownloadConfig: !autoDownloadConfig });
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

  useEffect(() => {
    setState({ ...getState(), apiKeyId: installShipperSetup?.apiKeyId ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installShipperSetup?.apiKeyId]);

  const apiKeyEncoded = installShipperSetup?.apiKeyEncoded;

  const {
    data: progressData,
    status: progressStatus,
    refetch: refetchProgress,
  } = useFetcher(
    (callApi) => {
      if (CurrentStep === InstallElasticAgent && getState().apiKeyId) {
        const { apiKeyId } = getState();
        return callApi(
          'GET /internal/observability_onboarding/custom_logs/progress',
          {
            params: { query: { apiKeyId } },
          }
        );
      }
    },
    [getState().apiKeyId]
  );

  const progressSucceded = progressStatus === FETCH_STATUS.SUCCESS;

  useEffect(() => {
    if (progressSucceded) {
      setTimeout(() => {
        refetchProgress();
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressSucceded]);

  const getStep = useCallback(
    ({ id, incompleteTitle, loadingTitle, completedTitle }) => {
      const progress = progressData?.progress;
      if (progress) {
        const stepStatus = progress[
          id
        ] as EuiStepsProps['steps'][number]['status'];
        const title =
          stepStatus === 'loading'
            ? loadingTitle
            : stepStatus === 'complete'
            ? completedTitle
            : incompleteTitle;
        return {
          title,
          children: null,
          status: stepStatus ?? ('incomplete' as const),
        };
      }
      return {
        title: incompleteTitle,
        children: null,
        status: 'incomplete' as const,
      };
    },
    [progressData?.progress]
  );

  const isInstallStarted = progressData?.progress['ea-download'] !== undefined;
  const isInstallCompleted = progressData?.progress['ea-status'] === 'complete';

  const autoDownloadConfigStep = getStep({
    id: 'ea-config',
    incompleteTitle: i18n.translate(
      'xpack.observability_onboarding.installElasticAgent.progress.eaConfig.incompleteTitle',
      { defaultMessage: 'Configure the agent' }
    ),
    loadingTitle: i18n.translate(
      'xpack.observability_onboarding.installElasticAgent.progress.eaConfig.loadingTitle',
      { defaultMessage: 'Downloading Elastic Agent config' }
    ),
    completedTitle: i18n.translate(
      'xpack.observability_onboarding.installElasticAgent.progress.eaConfig.completedTitle',
      {
        defaultMessage: 'Elastic Agent config written to {configPath}',
        values: { configPath: '/opt/Elastic/Agent/elastic-agent.yml' },
      }
    ),
  });

  return (
    <StepPanel
      title={i18n.translate(
        'xpack.observability_onboarding.installElasticAgent.title',
        { defaultMessage: 'Install shipper to collect data' }
      )}
      panelFooter={
        <StepPanelFooter
          items={[
            <EuiButton color="text" onClick={onBack}>
              {i18n.translate('xpack.observability_onboarding.steps.back', {
                defaultMessage: 'Back',
              })}
            </EuiButton>,
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onInspect}>
                  {i18n.translate(
                    'xpack.observability_onboardbacking.steps.inspect',
                    { defaultMessage: 'Inspect' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  fill
                  iconType="magnifyWithPlus"
                  onClick={onContinue}
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.steps.exploreLogs',
                    { defaultMessage: 'Explore logs' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        />
      }
    >
      <StepPanelContent>
        <EuiText color="subdued">
          <p>
            {i18n.translate(
              'xpack.observability_onboarding.installElasticAgent.description',
              {
                defaultMessage:
                  'Add Elastic Agent to your hosts to begin sending data to your Elastic Cloud. Run standalone if you want to download and manage each agent configuration file on your own, or enroll in Fleet, for centralized management of all your agents through our Fleet managed interface.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSteps
          steps={[
            {
              title: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.installStep.title',
                { defaultMessage: 'Install the Elastic Agent' }
              ),
              status:
                installShipperSetupStatus === FETCH_STATUS.LOADING
                  ? 'loading'
                  : isInstallCompleted
                  ? 'complete'
                  : 'current',
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.installElasticAgent.installStep.description',
                        {
                          defaultMessage:
                            'Select a platform and run the command to install in your Terminal, enroll, and start the Elastic Agent. Do this for each host. For other platforms, see our downloads page.  Review host requirements and other installation options.',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiButtonGroup
                    isFullWidth
                    legend={i18n.translate(
                      'xpack.observability_onboarding.installElasticAgent.installStep.choosePlatform',
                      { defaultMessage: 'Choose platform' }
                    )}
                    options={[
                      {
                        id: 'linux-tar',
                        label: i18n.translate(
                          'xpack.observability_onboarding.installElasticAgent.installStep.choosePlatform.linux',
                          { defaultMessage: 'Linux' }
                        ),
                      },
                      {
                        id: 'macos',
                        label: i18n.translate(
                          'xpack.observability_onboarding.installElasticAgent.installStep.choosePlatform.macOS',
                          { defaultMessage: 'MacOS' }
                        ),
                        isDisabled: true,
                      },
                      {
                        id: 'windows',
                        label: i18n.translate(
                          'xpack.observability_onboarding.installElasticAgent.installStep.choosePlatform.windows',
                          { defaultMessage: 'Windows' }
                        ),
                        isDisabled: true,
                      },
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
                    contentAriaLabel={i18n.translate(
                      'xpack.observability_onboarding.installElasticAgent.installStep.installCommandDescription',
                      { defaultMessage: 'Command to install elastic agent' }
                    )}
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
                        elasticAgentVersion:
                          installShipperSetup?.elasticAgentVersion,
                        autoDownloadConfig: wizardState.autoDownloadConfig,
                      })}
                    </EuiCodeBlock>
                  </EuiSkeletonRectangle>
                  <EuiSpacer size="m" />
                  <EuiSwitch
                    label={i18n.translate(
                      'xpack.observability_onboarding.installElasticAgent.installStep.autoDownloadConfig',
                      { defaultMessage: 'Auto download config' }
                    )}
                    checked={wizardState.autoDownloadConfig}
                    onChange={onAutoDownloadConfig}
                    disabled={isInstallStarted}
                  />
                  {isInstallStarted && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiSubSteps>
                        {[
                          {
                            id: 'ea-download',
                            incompleteTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaDownload.incompleteTitle',
                              { defaultMessage: 'Download Elastic Agent' }
                            ),
                            loadingTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaDownload.loadingTitle',
                              { defaultMessage: 'Downloading Elastic Agent' }
                            ),
                            completedTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaDownload.completedTitle',
                              { defaultMessage: 'Elastic Agent downloaded' }
                            ),
                          },
                          {
                            id: 'ea-extract',
                            incompleteTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaExtract.incompleteTitle',
                              { defaultMessage: 'Extract Elastic Agent' }
                            ),
                            loadingTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaExtract.loadingTitle',
                              { defaultMessage: 'Extracting Elastic Agent' }
                            ),
                            completedTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaExtract.completedTitle',
                              { defaultMessage: 'Elastic Agent extracted' }
                            ),
                          },
                          {
                            id: 'ea-install',
                            incompleteTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaInstall.incompleteTitle',
                              { defaultMessage: 'Install Elastic Agent' }
                            ),
                            loadingTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaInstall.loadingTitle',
                              { defaultMessage: 'Installing Elastic Agent' }
                            ),
                            completedTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaInstall.completedTitle',
                              { defaultMessage: 'Elastic Agent installed' }
                            ),
                          },
                          {
                            id: 'ea-status',
                            incompleteTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaStatus.incompleteTitle',
                              { defaultMessage: 'Connect to the Elastic Agent' }
                            ),
                            loadingTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaStatus.loadingTitle',
                              {
                                defaultMessage:
                                  'Connecting to the Elastic Agent',
                              }
                            ),
                            completedTitle: i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.progress.eaStatus.completedTitle',
                              {
                                defaultMessage:
                                  'Connected to the Elastic Agent',
                              }
                            ),
                          },
                        ].map((step, index) => {
                          const { title, status } = getStep(step);
                          return (
                            <EuiStep
                              key={step.id}
                              titleSize="xs"
                              step={index + 1}
                              title={title}
                              status={status}
                              children={null}
                              css={css({
                                '> .euiStep__content': {
                                  paddingBottom: 0,
                                },
                              })}
                            />
                          );
                        })}
                      </EuiSubSteps>
                    </>
                  )}
                </>
              ),
            },
            {
              title: wizardState.autoDownloadConfig
                ? autoDownloadConfigStep.title
                : i18n.translate(
                    'xpack.observability_onboarding.installElasticAgent.progress.eaConfig.incompleteTitle',
                    { defaultMessage: 'Configure the agent' }
                  ),
              status:
                yamlConfigStatus === FETCH_STATUS.LOADING
                  ? 'loading'
                  : autoDownloadConfigStep.status,
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      {wizardState.autoDownloadConfig
                        ? i18n.translate(
                            'xpack.observability_onboarding.installElasticAgent.configStep.auto.description',
                            {
                              defaultMessage:
                                'The agent config below will be downloaded by the install script and written to ({configPath}). This will overwrite any existing agent configuration.',
                              values: {
                                configPath:
                                  '/opt/Elastic/Agent/elastic-agent.yml',
                              },
                            }
                          )
                        : i18n.translate(
                            'xpack.observability_onboarding.installElasticAgent.configStep.manual.description',
                            {
                              defaultMessage:
                                'Copy the config below to the elastic agent.yml on the host where the Elastic Agent is installed ({configPath}).',
                              values: {
                                configPath:
                                  '/opt/Elastic/Agent/elastic-agent.yml',
                              },
                            }
                          )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiSkeletonRectangle
                    isLoading={yamlConfigStatus === FETCH_STATUS.LOADING}
                    contentAriaLabel={i18n.translate(
                      'xpack.observability_onboarding.installElasticAgent.configStep.yamlCodeBlockdescription',
                      { defaultMessage: 'Elastic agent yaml configuration' }
                    )}
                    width="100%"
                    height={300}
                    borderRadius="s"
                  >
                    <EuiCodeBlock
                      language="yaml"
                      isCopyable
                      style={{
                        opacity: wizardState.autoDownloadConfig ? '.5' : '1',
                      }}
                    >
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
                    isDisabled={wizardState.autoDownloadConfig}
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.installElasticAgent.configStep.downloadConfigButton',
                      { defaultMessage: 'Download config file' }
                    )}
                  </EuiButton>
                </>
              ),
            },
            getStep({
              id: 'logs-ingest',
              incompleteTitle: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.incompleteTitle',
                { defaultMessage: 'Check for shipped logs' }
              ),
              loadingTitle: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.loadingTitle',
                { defaultMessage: 'Waiting for logs to be shipped' }
              ),
              completedTitle: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.completedTitle',
                { defaultMessage: 'Logs are being shipped!' }
              ),
            }),
          ]}
        />
      </StepPanelContent>
    </StepPanel>
  );
}

function getInstallShipperCommand({
  elasticAgentPlatform,
  apiKeyEncoded = '$API_KEY',
  apiEndpoint = '$API_ENDPOINT',
  scriptDownloadUrl = '$SCRIPT_DOWNLOAD_URL',
  elasticAgentVersion = '$ELASTIC_AGENT_VERSION',
  autoDownloadConfig = false,
}: {
  elasticAgentPlatform: ElasticAgentPlatform;
  apiKeyEncoded: string | undefined;
  apiEndpoint: string | undefined;
  scriptDownloadUrl: string | undefined;
  elasticAgentVersion: string | undefined;
  autoDownloadConfig: boolean;
}) {
  const setupScriptFilename = 'standalone_agent_setup.sh';
  const PLATFORM_COMMAND: Record<ElasticAgentPlatform, string> = {
    'linux-tar': oneLine`
      curl ${scriptDownloadUrl} -o ${setupScriptFilename} &&
      sudo bash ${setupScriptFilename} ${apiKeyEncoded} ${apiEndpoint} ${elasticAgentVersion} ${
      autoDownloadConfig ? 'autoDownloadConfig=1' : ''
    }
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
