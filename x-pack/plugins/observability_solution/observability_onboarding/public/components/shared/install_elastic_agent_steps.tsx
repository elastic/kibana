/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
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
import { Buffer } from 'buffer';
import React, { ReactNode } from 'react';
import { intersection } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { StepStatus } from './step_status';

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
    disableSteps?: boolean;
    children?: ReactNode;
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
  const configPath =
    selectedPlatform === 'macos'
      ? '/Library/Elastic/Agent/elastic-agent.yml'
      : '/opt/Elastic/Agent/elastic-agent.yml';

  const isInstallStarted =
    intersection(
      Object.keys(installProgressSteps),
      Object.keys(PROGRESS_STEP_TITLES(configPath))
    ).length > 0;
  const autoDownloadConfigStep = getStep(
    'ea-config',
    installProgressSteps,
    configPath
  );

  const customInstallStep = installAgentPlatformOptions.find(
    (step) => step.id === selectedPlatform
  )?.children;
  const disableSteps = installAgentPlatformOptions.find(
    (step) => step.id === selectedPlatform
  )?.disableSteps;

  const installStepDefault = (
    <>
      <EuiCodeBlock language="bash" isCopyable>
        {installAgentCommand}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
      {showInstallProgressSteps && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="m">
            {(
              ['ea-download', 'ea-extract', 'ea-install', 'ea-status'] as const
            ).map((stepId) => {
              const { title, status, message } = getStep(
                stepId,
                installProgressSteps,
                configPath
              );
              return (
                <StepStatus status={status} title={title} message={message} />
              );
            })}
          </EuiFlexGroup>
        </>
      )}
    </>
  );

  const configureStep = (
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
                    configPath,
                  },
                }
              )
            : i18n.translate(
                'xpack.observability_onboarding.installElasticAgent.configStep.manual.description',
                {
                  defaultMessage:
                    'Add the following configuration to {configPath} on the host where you installed the Elastic Agent.',
                  values: {
                    configPath,
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
          { defaultMessage: 'Elastic Agent yaml configuration' }
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
        data-test-subj="obltOnboardingConfigureElasticAgentStepDownloadConfig"
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
  );

  return (
    <EuiSteps
      steps={[
        {
          'data-test-subj': 'obltOnboardingInstallElasticAgentStep',
          title: i18n.translate(
            'xpack.observability_onboarding.installElasticAgent.installStep.title',
            { defaultMessage: 'Install the Elastic Agent' }
          ),
          status: installAgentStatus,
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
                          data-test-subj="observabilityOnboardingInstallElasticAgentStepsHostRequirementsAndOtherInstallationOptionsLink"
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
                checked={autoDownloadConfig}
                onChange={onToggleAutoDownloadConfig}
                disabled={disableSteps || isInstallStarted}
                data-test-subj="obltOnboardingInstallElasticAgentAutoDownloadConfig"
              />
              <EuiSpacer size="l" />
              {autoDownloadConfig && (
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
                    data-test-subj="obltOnboardingInstallElasticAgentAutoDownloadConfigCallout"
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
              {customInstallStep || installStepDefault}
            </>
          ),
        },
        {
          'data-test-subj': 'obltOnboardingConfigureElasticAgentStep',
          title: i18n.translate(
            'xpack.observability_onboarding.installElasticAgent.configureStep.title',
            { defaultMessage: 'Configure the Elastic Agent' }
          ),
          status: disableSteps ? 'disabled' : configureAgentStatus,
          children: disableSteps ? <></> : configureStep,
        },
        ...appendedSteps.map((euiStep) => ({
          children: null,
          ...euiStep,
          status: disableSteps ? 'disabled' : euiStep.status,
          'data-test-subj': euiStep['data-test-subj'],
        })),
      ]}
    />
  );
}

function getStep(
  id: ProgressStepId,
  installProgressSteps: Props<string>['installProgressSteps'],
  configPath: string
): { title: string; status: EuiStepStatus; message?: string } {
  const { loadingTitle, completedTitle, incompleteTitle } =
    PROGRESS_STEP_TITLES(configPath)[id];
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

const PROGRESS_STEP_TITLES: (
  configPath: string
) => Record<
  ProgressStepId,
  Record<'incompleteTitle' | 'loadingTitle' | 'completedTitle', string>
> = (configPath: string) => ({
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
        values: {
          configPath,
        },
      }
    ),
  },
});
