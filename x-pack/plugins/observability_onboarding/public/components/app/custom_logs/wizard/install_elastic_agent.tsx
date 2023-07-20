/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiSteps,
  EuiStepsProps,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Buffer } from 'buffer';
import { flatten, zip } from 'lodash';
import { default as React, useCallback, useEffect, useState } from 'react';
import { useWizard } from '.';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaNavigation } from '../../../../hooks/use_kibana_navigation';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { ApiKeyBanner } from './api_key_banner';
import { BackButton } from './back_button';
import { StepStatus } from './step_status';

type ElasticAgentPlatform = 'linux-tar' | 'macos' | 'windows';
export function InstallElasticAgent() {
  const { navigateToKibanaUrl } = useKibanaNavigation();
  const { goBack, goToStep, getState, setState } = useWizard();
  const wizardState = getState();
  const [elasticAgentPlatform, setElasticAgentPlatform] =
    useState<ElasticAgentPlatform>('linux-tar');

  function onInspect() {
    goToStep('inspect');
  }
  function onContinue() {
    navigateToKibanaUrl('/app/logs/stream');
  }

  function onAutoDownloadConfig() {
    setState((state) => ({
      ...state,
      autoDownloadConfig: !state.autoDownloadConfig,
    }));
  }

  const { data: monitoringRole, status: monitoringRoleStatus } = useFetcher(
    (callApi) => {
      if (!hasAlreadySavedFlow(getState())) {
        return callApi(
          'GET /internal/observability_onboarding/custom_logs/privileges'
        );
      }
    },
    []
  );

  const { data: setup } = useFetcher((callApi) => {
    return callApi(
      'GET /internal/observability_onboarding/custom_logs/install_shipper_setup'
    );
  }, []);

  const {
    data: installShipperSetup,
    status: installShipperSetupStatus,
    error,
  } = useFetcher(
    (callApi) => {
      const {
        datasetName,
        serviceName,
        namespace,
        customConfigurations,
        logFilePaths,
      } = getState();
      if (!hasAlreadySavedFlow(getState()) && monitoringRole?.hasPrivileges) {
        return callApi(
          'POST /internal/observability_onboarding/custom_logs/save',
          {
            params: {
              body: {
                name: datasetName,
                state: {
                  datasetName,
                  serviceName,
                  namespace,
                  customConfigurations,
                  logFilePaths,
                },
              },
            },
          }
        );
      }
    },
    [monitoringRole?.hasPrivileges]
  );

  const { status: saveOnboardingStateDataStatus } = useFetcher((callApi) => {
    const {
      onboardingId,
      datasetName,
      serviceName,
      namespace,
      customConfigurations,
      logFilePaths,
    } = getState();
    if (onboardingId) {
      return callApi(
        'PUT /internal/observability_onboarding/custom_logs/{onboardingId}/save',
        {
          params: {
            path: { onboardingId },
            body: {
              state: {
                datasetName,
                serviceName,
                namespace,
                customConfigurations,
                logFilePaths,
              },
            },
          },
        }
      );
    }
  }, []);

  const { apiKeyEncoded, onboardingId } = installShipperSetup ?? getState();

  const { data: yamlConfig = '', status: yamlConfigStatus } = useFetcher(
    (callApi) => {
      if (apiKeyEncoded && onboardingId) {
        return callApi(
          'GET /internal/observability_onboarding/elastic_agent/config',
          {
            headers: { authorization: `ApiKey ${apiKeyEncoded}` },
            params: { query: { onboardingId } },
          }
        );
      }
    },
    [
      apiKeyEncoded,
      onboardingId,
      saveOnboardingStateDataStatus === FETCH_STATUS.SUCCESS,
    ]
  );

  useEffect(() => {
    setState((state) => ({ ...state, onboardingId, apiKeyEncoded }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingId, apiKeyEncoded]);

  const {
    data: progressData,
    status: progressStatus,
    refetch: refetchProgress,
  } = useFetcher(
    (callApi) => {
      if (onboardingId) {
        return callApi(
          'GET /internal/observability_onboarding/custom_logs/{onboardingId}/progress',
          { params: { path: { onboardingId } } }
        );
      }
    },
    [onboardingId]
  );

  const progressSucceded = progressStatus === FETCH_STATUS.SUCCESS;

  useEffect(() => {
    if (progressSucceded) {
      setTimeout(() => {
        refetchProgress();
      }, 2000);
    }
  }, [progressSucceded, refetchProgress]);

  const getStep = useCallback(
    ({ id, incompleteTitle, loadingTitle, completedTitle }) => {
      const progress = progressData?.progress;
      if (progress) {
        const stepStatus = progress?.[id]
          ?.status as EuiStepsProps['steps'][number]['status'];
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
          message: progress?.[id]?.message,
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
  const isInstallCompleted =
    progressData?.progress?.['ea-status']?.status === 'complete';

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
      panelFooter={
        <StepPanelFooter
          items={[
            <BackButton onBack={goBack} />,
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onInspect}>
                  {i18n.translate(
                    'xpack.observability_onboarding.steps.inspect',
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
                  'To collect the data from your system and stream it to Elastic, you first need to install a shipping tool on the machine generating the logs. In this case, the shipper is an Agent developed by Elastic.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {apiKeyEncoded && onboardingId ? (
          <ApiKeyBanner
            payload={{ apiKeyEncoded, onboardingId }}
            hasPrivileges
            status={FETCH_STATUS.SUCCESS}
          />
        ) : (
          monitoringRoleStatus !== FETCH_STATUS.NOT_INITIATED &&
          monitoringRoleStatus !== FETCH_STATUS.LOADING && (
            <ApiKeyBanner
              payload={installShipperSetup}
              hasPrivileges={monitoringRole?.hasPrivileges}
              status={installShipperSetupStatus}
              error={error}
            />
          )
        )}
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
                      <FormattedMessage
                        id="xpack.observability_onboarding.installElasticAgent.installStep.description"
                        defaultMessage="Select your platform, and run the install command in your terminal to enroll and start the Elastic Agent. Do this for each host. Review {hostRequirementsLink} before installing."
                        values={{
                          hostRequirementsLink: (
                            <EuiLink
                              external
                              href="https://www.elastic.co/guide/en/fleet/8.7/elastic-agent-installation.html"
                            >
                              {i18n.translate(
                                'xpack.observability_onboarding.installElasticAgent.installStep.hostRequirements',
                                {
                                  defaultMessage:
                                    'host requirements and other installation options',
                                }
                              )}
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer size="l" />
                  <EuiSwitch
                    label={
                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="xs"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          {i18n.translate(
                            'xpack.observability_onboarding.installElasticAgent.installStep.autoDownloadConfig',
                            {
                              defaultMessage:
                                "Automatically download the agent's config",
                            }
                          )}
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiIconTip
                            content={i18n.translate(
                              'xpack.observability_onboarding.installElasticAgent.installStep.autoDownloadConfig.tooltip',
                              {
                                defaultMessage:
                                  "Turn on to add a string to the following code block that downloads the agent's standard configuration to your host during installation. Turn off to manually configure the agent in the next step.",
                              }
                            )}
                            position="right"
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                    checked={wizardState.autoDownloadConfig}
                    onChange={onAutoDownloadConfig}
                    disabled={
                      isInstallStarted ||
                      (monitoringRole && !monitoringRole?.hasPrivileges)
                    }
                  />
                  <EuiSpacer size="l" />
                  {wizardState.autoDownloadConfig && (
                    <>
                      <EuiCallOut
                        title={i18n.translate(
                          'xpack.observability_onboarding.installElasticAgent.installStep.autoDownloadConfig.overwriteWarning',
                          {
                            defaultMessage:
                              'Automatically downloading the agent config will overwrite any existing agent config on your host.',
                          }
                        )}
                        color="warning"
                        iconType="warning"
                      />
                      <EuiSpacer size="l" />
                    </>
                  )}
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
                  <EuiCodeBlock language="bash" isCopyable>
                    {getInstallShipperCommand({
                      elasticAgentPlatform,
                      apiKeyEncoded,
                      apiEndpoint: setup?.apiEndpoint,
                      scriptDownloadUrl: setup?.scriptDownloadUrl,
                      elasticAgentVersion: setup?.elasticAgentVersion,
                      autoDownloadConfig: wizardState.autoDownloadConfig,
                      onboardingId,
                    })}
                  </EuiCodeBlock>
                  <EuiSpacer size="m" />
                  {isInstallStarted && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFlexGroup direction="column" gutterSize="m">
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
                          const { title, status, message } = getStep(step);
                          return (
                            <StepStatus
                              status={status}
                              title={title}
                              message={message}
                            />
                          );
                        })}
                      </EuiFlexGroup>
                    </>
                  )}
                </>
              ),
            },
            {
              title: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.configureStep.title',
                { defaultMessage: 'Configure the Elastic agent' }
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
                                'Add the following configuration to {configPath} on the host where you installed the Elastic agent.',
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
                    isLoading={yamlConfigStatus === FETCH_STATUS.NOT_INITIATED}
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
                  <EuiSpacer size="m" />
                  <EuiFlexGroup direction="column">
                    <StepStatus
                      status={autoDownloadConfigStep.status}
                      title={autoDownloadConfigStep.title}
                      message={autoDownloadConfigStep.message}
                    />
                  </EuiFlexGroup>
                </>
              ),
            },
            getStep({
              id: 'logs-ingest',
              incompleteTitle: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.incompleteTitle',
                { defaultMessage: 'Ship logs to Elastic Observability' }
              ),
              loadingTitle: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.loadingTitle',
                { defaultMessage: 'Waiting for Logs to be shipped...' }
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
  onboardingId = '$ONBOARDING_ID',
}: {
  elasticAgentPlatform: ElasticAgentPlatform;
  apiKeyEncoded: string | undefined;
  apiEndpoint: string | undefined;
  scriptDownloadUrl: string | undefined;
  elasticAgentVersion: string | undefined;
  autoDownloadConfig: boolean;
  onboardingId: string | undefined;
}) {
  const setupScriptFilename = 'standalone_agent_setup.sh';
  const PLATFORM_COMMAND: Record<ElasticAgentPlatform, string> = {
    'linux-tar': oneLine`
      curl ${scriptDownloadUrl} -o ${setupScriptFilename} &&
      sudo bash ${setupScriptFilename} ${apiKeyEncoded} ${apiEndpoint} ${elasticAgentVersion} ${onboardingId} ${
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

type WizardState = ReturnType<ReturnType<typeof useWizard>['getState']>;
function hasAlreadySavedFlow({ apiKeyEncoded, onboardingId }: WizardState) {
  return Boolean(apiKeyEncoded && onboardingId);
}
