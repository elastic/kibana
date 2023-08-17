/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { default as React, useCallback, useEffect, useState } from 'react';
import { ObservabilityOnboardingPluginSetupDeps } from '../../../../plugin';
import { useWizard } from '.';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import {
  ElasticAgentPlatform,
  getElasticAgentSetupCommand,
} from '../../../shared/get_elastic_agent_setup_command';
import {
  InstallElasticAgentSteps,
  ProgressStepId,
  EuiStepStatus,
} from '../../../shared/install_elastic_agent_steps';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { ApiKeyBanner } from './api_key_banner';
import { BackButton } from './back_button';
import { getDiscoverNavigationParams } from '../../utils';
import { WindowsInstallStep } from '../../../shared/windows_install_step';
import { TroubleshootingLink } from '../../../shared/troubleshooting_link';

export function InstallElasticAgent() {
  const {
    services: {
      discover: { locator },
    },
  } = useKibana<ObservabilityOnboardingPluginSetupDeps>();
  const { goBack, goToStep, getState, setState } = useWizard();
  const wizardState = getState();
  const [elasticAgentPlatform, setElasticAgentPlatform] =
    useState<ElasticAgentPlatform>('linux-tar');

  function onInspect() {
    goToStep('inspect');
  }
  async function onContinue() {
    await locator?.navigate(
      getDiscoverNavigationParams([wizardState.datasetName])
    );
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
          'GET /internal/observability_onboarding/logs/setup/privileges'
        );
      }
    },
    []
  );

  const { data: setup } = useFetcher((callApi) => {
    return callApi(
      'GET /internal/observability_onboarding/logs/setup/environment'
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
        return callApi('POST /internal/observability_onboarding/logs/flow', {
          params: {
            body: {
              name: datasetName,
              type: 'logFiles',
              state: {
                datasetName,
                serviceName,
                namespace,
                customConfigurations,
                logFilePaths,
              },
            },
          },
        });
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
        'PUT /internal/observability_onboarding/flow/{onboardingId}',
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
          'GET /internal/observability_onboarding/flow/{onboardingId}/progress',
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

  const getCheckLogsStep = useCallback(() => {
    const progress = progressData?.progress;
    if (progress) {
      const stepStatus = progress?.['logs-ingest']?.status as EuiStepStatus;
      const title =
        stepStatus === 'loading'
          ? CHECK_LOGS_LABELS.loading
          : stepStatus === 'complete'
          ? CHECK_LOGS_LABELS.completed
          : CHECK_LOGS_LABELS.incomplete;
      return { title, status: stepStatus };
    }
    return {
      title: CHECK_LOGS_LABELS.incomplete,
      status: 'incomplete' as const,
    };
  }, [progressData?.progress]);

  const isInstallStarted = progressData?.progress['ea-download'] !== undefined;
  const isInstallCompleted =
    progressData?.progress?.['ea-status']?.status === 'complete';
  const autoDownloadConfigStatus = (progressData?.progress?.['ea-config']
    ?.status ?? 'incomplete') as EuiStepStatus;

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
        {wizardState.integrationName && (
          <>
            <EuiCallOut
              title={i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.integrationSuccessCallout.title',
                {
                  defaultMessage: '{integrationName} integration installed.',
                  values: {
                    integrationName: wizardState.integrationName,
                  },
                }
              )}
              color="success"
              iconType="check"
            />
            <EuiSpacer size="m" />
          </>
        )}
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
        <InstallElasticAgentSteps
          installAgentPlatformOptions={[
            {
              label: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.installStep.choosePlatform.linux',
                { defaultMessage: 'Linux' }
              ),
              id: 'linux-tar',
            },
            {
              label: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.installStep.choosePlatform.macOS',
                { defaultMessage: 'MacOS' }
              ),
              id: 'macos',
            },
            {
              label: i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.installStep.choosePlatform.windows',
                { defaultMessage: 'Windows' }
              ),
              id: 'windows',
              disableSteps: true,
              children: (
                <WindowsInstallStep docsLink="https://www.elastic.co/guide/en/observability/current/logs-stream.html" />
              ),
            },
          ]}
          onSelectPlatform={(id) => setElasticAgentPlatform(id)}
          selectedPlatform={elasticAgentPlatform}
          installAgentCommand={getElasticAgentSetupCommand({
            elasticAgentPlatform,
            apiKeyEncoded,
            apiEndpoint: setup?.apiEndpoint,
            scriptDownloadUrl: setup?.scriptDownloadUrl,
            elasticAgentVersion: setup?.elasticAgentVersion,
            autoDownloadConfig: wizardState.autoDownloadConfig,
            onboardingId,
          })}
          autoDownloadConfig={wizardState.autoDownloadConfig}
          onToggleAutoDownloadConfig={onAutoDownloadConfig}
          installAgentStatus={
            installShipperSetupStatus === FETCH_STATUS.LOADING
              ? 'loading'
              : isInstallCompleted
              ? 'complete'
              : 'current'
          }
          showInstallProgressSteps={isInstallStarted}
          installProgressSteps={
            (progressData?.progress ?? {}) as Partial<
              Record<
                ProgressStepId,
                { status: EuiStepStatus; message?: string }
              >
            >
          }
          configureAgentStatus={
            yamlConfigStatus === FETCH_STATUS.LOADING
              ? 'loading'
              : autoDownloadConfigStatus
          }
          configureAgentYaml={yamlConfig}
          appendedSteps={[getCheckLogsStep()]}
        />
      </StepPanelContent>
      <EuiHorizontalRule />
      <TroubleshootingLink />
    </StepPanel>
  );
}

type WizardState = ReturnType<ReturnType<typeof useWizard>['getState']>;
function hasAlreadySavedFlow({ apiKeyEncoded, onboardingId }: WizardState) {
  return Boolean(apiKeyEncoded && onboardingId);
}

const CHECK_LOGS_LABELS = {
  incomplete: i18n.translate(
    'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.incompleteTitle',
    { defaultMessage: 'Ship logs to Elastic Observability' }
  ),
  loading: i18n.translate(
    'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.loadingTitle',
    { defaultMessage: 'Waiting for Logs to be shipped...' }
  ),
  completed: i18n.translate(
    'xpack.observability_onboarding.installElasticAgent.progress.logsIngest.completedTitle',
    { defaultMessage: 'Logs are being shipped!' }
  ),
};
