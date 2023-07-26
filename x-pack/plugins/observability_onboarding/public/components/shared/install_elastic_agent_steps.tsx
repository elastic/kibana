/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiSteps,
  EuiStepsProps,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Buffer } from 'buffer';
import React from 'react';
import { intersection } from 'lodash';
import { StepStatus } from '../app/custom_logs/wizard/step_status';

export type EuiStepStatus = EuiStepsProps['steps'][number]['status'];

export type ProgressStepId =
  | 'ea-download'
  | 'ea-extract'
  | 'ea-install'
  | 'ea-status'
  | 'ea-config';

interface Props<PlatformId extends string> {
  installAgentPlatformOptions: Array<{
    label: string;
    id: PlatformId;
    isDisabled?: boolean;
  }>;
  onSelectPlatform: (id: PlatformId) => void;
  selectedPlatform: PlatformId;
  installAgentCommand: string;
  autoDownloadConfig: boolean;
  onToggleAutoDownloadConfig: () => void;
  installAgentStatus: EuiStepStatus;
  showInstallProgressSteps: boolean;
  installProgressSteps: Partial<
    Record<ProgressStepId, { status: EuiStepStatus; message?: string }>
  >;
  configureAgentStatus: EuiStepStatus;
  configureAgentYaml: string;
  appendedSteps?: Array<Omit<EuiStepsProps['steps'][number], 'children'>>;
}

export function InstallElasticAgentSteps<PlatformId extends string>({
  installAgentPlatformOptions,
  onSelectPlatform,
  selectedPlatform,
  installAgentCommand,
  autoDownloadConfig,
  onToggleAutoDownloadConfig,
  installAgentStatus,
  showInstallProgressSteps,
  installProgressSteps,
  configureAgentStatus,
  configureAgentYaml,
  appendedSteps = [],
}: Props<PlatformId>) {
  const isInstallStarted =
    intersection(
      Object.keys(installProgressSteps),
      Object.keys(PROGRESS_STEP_TITLES)
    ).length > 0;
  const autoDownloadConfigStep = getStep('ea-config', installProgressSteps);
  return (
    <EuiSteps
      steps={[
        {
          title: i18n.translate(
            'xpack.observability_onboarding.installElasticAgent.installStep.title',
            { defaultMessage: 'Install the Elastic Agent' }
          ),
          status: installAgentStatus,
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
                options={installAgentPlatformOptions.map(
                  ({ id, label, isDisabled }) => ({
                    id,
                    label,
                    isDisabled,
                  })
                )}
                type="single"
                idSelected={selectedPlatform}
                onChange={(id: string) => {
                  onSelectPlatform(id as PlatformId);
                }}
                isDisabled={isInstallStarted}
              />
              <EuiSpacer size="m" />
              <EuiCodeBlock language="bash" isCopyable>
                {installAgentCommand}
              </EuiCodeBlock>
              <EuiSpacer size="m" />
              <EuiSwitch
                label={i18n.translate(
                  'xpack.observability_onboarding.installElasticAgent.installStep.autoDownloadConfig',
                  { defaultMessage: 'Auto download config' }
                )}
                checked={autoDownloadConfig}
                onChange={onToggleAutoDownloadConfig}
                disabled={isInstallStarted}
              />
              {showInstallProgressSteps && (
                <>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup direction="column" gutterSize="m">
                    {(
                      [
                        'ea-download',
                        'ea-extract',
                        'ea-install',
                        'ea-status',
                      ] as const
                    ).map((stepId) => {
                      const { title, status, message } = getStep(
                        stepId,
                        installProgressSteps
                      );
                      return (
                        <StepStatus
                          key={stepId}
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
          status: configureAgentStatus,
          children: (
            <>
              <EuiText color="subdued">
                <p>
                  {autoDownloadConfig
                    ? i18n.translate(
                        'xpack.observability_onboarding.installElasticAgent.configStep.auto.description',
                        {
                          defaultMessage:
                            'The agent config below will be downloaded by the install script and written to ({configPath}). This will overwrite any existing agent configuration.',
                          values: {
                            configPath: '/opt/Elastic/Agent/elastic-agent.yml',
                          },
                        }
                      )
                    : i18n.translate(
                        'xpack.observability_onboarding.installElasticAgent.configStep.manual.description',
                        {
                          defaultMessage:
                            'Copy the config below to the elastic agent.yml on the host where the Elastic Agent is installed ({configPath}).',
                          values: {
                            configPath: '/opt/Elastic/Agent/elastic-agent.yml',
                          },
                        }
                      )}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiSkeletonRectangle
                isLoading={false}
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
                    opacity: autoDownloadConfig ? '.5' : '1',
                  }}
                >
                  {configureAgentYaml}
                </EuiCodeBlock>
              </EuiSkeletonRectangle>
              <EuiSpacer size="m" />
              <EuiButton
                iconType="download"
                color="primary"
                href={`data:application/yaml;base64,${Buffer.from(
                  configureAgentYaml,
                  'utf8'
                ).toString('base64')}`}
                download="elastic-agent.yml"
                target="_blank"
                isDisabled={autoDownloadConfig}
              >
                {i18n.translate(
                  'xpack.observability_onboarding.installElasticAgent.configStep.downloadConfigButton',
                  { defaultMessage: 'Download config file' }
                )}
              </EuiButton>
              {showInstallProgressSteps && autoDownloadConfig ? (
                <>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup direction="column">
                    <StepStatus
                      status={autoDownloadConfigStep.status}
                      title={autoDownloadConfigStep.title}
                      message={autoDownloadConfigStep.message}
                    />
                  </EuiFlexGroup>
                </>
              ) : null}
            </>
          ),
        },
        ...appendedSteps.map((euiStep) => ({ children: null, ...euiStep })),
      ]}
    />
  );
}

function getStep(
  id: ProgressStepId,
  installProgressSteps: Props<string>['installProgressSteps']
): { title: string; status: EuiStepStatus; message?: string } {
  const { loadingTitle, completedTitle, incompleteTitle } =
    PROGRESS_STEP_TITLES[id];
  const stepProgress = installProgressSteps[id];
  if (stepProgress) {
    const { status, message } = stepProgress;
    const title =
      status === 'loading'
        ? loadingTitle
        : status === 'complete'
        ? completedTitle
        : incompleteTitle;
    return {
      title,
      status: status ?? ('incomplete' as const),
      message,
    };
  }

  return {
    title: incompleteTitle,
    status: 'incomplete' as const,
  };
}

const PROGRESS_STEP_TITLES: Record<
  ProgressStepId,
  Record<'incompleteTitle' | 'loadingTitle' | 'completedTitle', string>
> = {
  'ea-download': {
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
  'ea-extract': {
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
  'ea-install': {
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
  'ea-status': {
    incompleteTitle: i18n.translate(
      'xpack.observability_onboarding.installElasticAgent.progress.eaStatus.incompleteTitle',
      { defaultMessage: 'Connect to the Elastic Agent' }
    ),
    loadingTitle: i18n.translate(
      'xpack.observability_onboarding.installElasticAgent.progress.eaStatus.loadingTitle',
      {
        defaultMessage: 'Connecting to the Elastic Agent',
      }
    ),
    completedTitle: i18n.translate(
      'xpack.observability_onboarding.installElasticAgent.progress.eaStatus.completedTitle',
      {
        defaultMessage: 'Connected to the Elastic Agent',
      }
    ),
  },
  'ea-config': {
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
  },
};
