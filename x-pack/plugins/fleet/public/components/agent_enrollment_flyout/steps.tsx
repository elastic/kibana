/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCopy,
  EuiCodeBlock,
  EuiRadioGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';
import semverPatch from 'semver/functions/patch';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { AgentPolicy } from '../../types';
import { useGetSettings, useKibanaVersion, useStartServices } from '../../hooks';

import { agentPolicyRouteService } from '../../../common';

import { sendGetK8sManifest } from '../../hooks/use_request/k8s';
import type { GetOneEnrollmentAPIKeyResponse } from '../../../common/types/rest_spec/enrollment_api_key';

import { ManualInstructions } from '../enrollment_instructions';
import type { CommandsByPlatform } from '../../applications/fleet/sections/agents/agent_requirements_page/components/install_command_utils';
import { PlatformSelector } from '../enrollment_instructions/manual/platform_selector';

import type { InstalledIntegrationPolicy } from '../../hooks';

import type { FlyoutMode } from './types';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';
import { SelectCreateAgentPolicy } from './agent_policy_select_create';
import { ConfirmAgentEnrollment } from './confirm_agent_enrollment';
import { ConfirmIncomingData } from './confirm_incoming_data';
import { InstallationMessage } from './installation_message';

export const DownloadStep = (
  hasFleetServer: boolean,
  isK8s?: string,
  enrollmentAPIKey?: string
) => {
  const kibanaVersion = useKibanaVersion();
  const core = useStartServices();
  const settings = useGetSettings();
  const kibanaVersionURLString = useMemo(
    () =>
      `${semverMajor(kibanaVersion)}-${semverMinor(kibanaVersion)}-${semverPatch(kibanaVersion)}`,
    [kibanaVersion]
  );
  const { notifications } = core;

  const [yaml, setYaml] = useState<any | undefined>();
  const [fleetServer, setFleetServer] = useState<string | ''>();
  useEffect(() => {
    async function fetchK8sManifest() {
      try {
        if (isK8s !== 'IS_KUBERNETES') {
          return;
        }
        const fleetServerHosts = settings.data?.item.fleet_server_hosts;
        let host = '';
        if (fleetServerHosts !== undefined && fleetServerHosts.length !== 0) {
          setFleetServer(fleetServerHosts[0]);
          host = fleetServerHosts[0];
        }
        const query = { fleetServer: host, enrolToken: enrollmentAPIKey };
        const res = await sendGetK8sManifest(query);
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching agent manifest');
        }

        setYaml(res.data.item);
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.agentEnrollment.loadk8sManifestErrorTitle', {
            defaultMessage: 'Error while fetching agent manifest',
          }),
        });
      }
    }
    fetchK8sManifest();
  }, [isK8s, notifications.toasts, enrollmentAPIKey, settings.data?.item.fleet_server_hosts]);

  const altTitle =
    isK8s === 'IS_KUBERNETES'
      ? i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentForK8sTitle', {
          defaultMessage: 'Download the Elastic Agent Manifest',
        })
      : i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentTitle', {
          defaultMessage: 'Download the Elastic Agent to your host',
        });
  const title = hasFleetServer
    ? i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentForFleetServerTitle', {
        defaultMessage: 'Download the Fleet Server to a centralized host',
      })
    : altTitle;

  const altDownloadDescription =
    isK8s === 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadDescriptionForK8s"
        defaultMessage="Copy or download the Kubernetes manifest inside the Kubernetes cluster. Check {FleetUrlVariable} and {FleetTokenVariable} in the Daemonset environment variables and apply the manifest."
        values={{
          FleetUrlVariable: <EuiCode>FLEET_URL</EuiCode>,
          FleetTokenVariable: <EuiCode>FLEET_ENROLLMENT_TOKEN</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadDescription"
        defaultMessage="Install the Elastic Agent on the hosts you wish to monitor. Do not install this agent policy on a host containing Fleet Server. You can download the Elastic Agent binaries and verification signatures from Elastic’s download page."
      />
    );

  const downloadDescription = hasFleetServer ? (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescriptionForFleetServer"
      defaultMessage="Fleet Server runs on an Elastic Agent. Install this agent on a centralized host so that other hosts you wish to monitor can connect to it. In production, we recommend using one or more dedicated hosts. You can download the Elastic Agent binaries and verification signatures from Elastic’s download page."
    />
  ) : (
    altDownloadDescription
  );

  const linuxUsers =
    isK8s !== 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadUseLinuxInstaller"
        defaultMessage="Linux users: We recommend the installer (TAR) over system packages (RPM/DEB) because it lets you upgrade your agent in Fleet."
      />
    ) : (
      ''
    );
  const k8sCopyYaml =
    isK8s === 'IS_KUBERNETES' ? (
      <EuiCopy textToCopy={yaml}>
        {(copy) => (
          <EuiButton onClick={copy} iconType="copyClipboard">
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.copyPolicyButton"
              defaultMessage="Copy to clipboard"
            />
          </EuiButton>
        )}
      </EuiCopy>
    ) : (
      ''
    );
  const k8sYaml =
    isK8s === 'IS_KUBERNETES' ? (
      <EuiCodeBlock language="yaml" style={{ maxHeight: 300 }} fontSize="m">
        {yaml}
      </EuiCodeBlock>
    ) : (
      ''
    );

  const downloadLink =
    isK8s === 'IS_KUBERNETES'
      ? core.http.basePath.prepend(
          `${agentPolicyRouteService.getK8sFullDownloadPath()}?fleetServer=${fleetServer}&enrolToken=${enrollmentAPIKey}`
        )
      : `https://www.elastic.co/downloads/past-releases/elastic-agent-${kibanaVersionURLString}`;

  const downloadMsg =
    isK8s === 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadManifestButtonk8s"
        defaultMessage="Download Manifest"
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadLink"
        defaultMessage="Go to download page"
      />
    );

  return {
    title,
    children: (
      <>
        <EuiText>{downloadDescription}</EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <>{linuxUsers}</>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButton href={downloadLink} target="_blank" iconSide="right" iconType="popout">
              <>{downloadMsg}</>
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>{k8sCopyYaml}</>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <>{k8sYaml}</>
      </>
    ),
  };
};

export const AgentPolicySelectionStep = ({
  agentPolicies,
  selectedPolicy,
  setSelectedPolicyId,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  excludeFleetServer,
  refreshAgentPolicies,
}: {
  agentPolicies: AgentPolicy[];
  selectedPolicy?: AgentPolicy;
  setSelectedPolicyId: (agentPolicyId?: string) => void;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId?: (key?: string) => void;
  excludeFleetServer?: boolean;
  refreshAgentPolicies: () => void;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepChooseAgentPolicyTitle', {
      defaultMessage: 'What type of host are you adding?',
    }),
    children: (
      <>
        <SelectCreateAgentPolicy
          agentPolicies={agentPolicies}
          selectedPolicy={selectedPolicy}
          setSelectedPolicyId={setSelectedPolicyId}
          withKeySelection={setSelectedAPIKeyId ? true : false}
          selectedApiKeyId={selectedApiKeyId}
          onKeyChange={setSelectedAPIKeyId}
          refreshAgentPolicies={refreshAgentPolicies}
          excludeFleetServer={excludeFleetServer}
        />
      </>
    ),
  };
};

export const AgentEnrollmentKeySelectionStep = ({
  selectedPolicy,
  selectedApiKeyId,
  setSelectedAPIKeyId,
}: {
  selectedPolicy?: AgentPolicy;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId: (key?: string) => void;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigurePolicyAuthenticationTitle', {
      defaultMessage: 'Select enrollment token',
    }),
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.agentAuthenticationSettings"
            defaultMessage="{agentPolicyName} has been selected. Select which enrollment token to use when enrolling agents."
            values={{
              agentPolicyName: <strong>{selectedPolicy?.name}</strong>,
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
        <AdvancedAgentAuthenticationSettings
          agentPolicyId={selectedPolicy?.id}
          selectedApiKeyId={selectedApiKeyId}
          initialAuthenticationSettingsOpen
          onKeyChange={setSelectedAPIKeyId}
        />
      </>
    ),
  };
};

export const InstallationModeSelectionStep = ({
  mode,
  setMode,
}: {
  mode: FlyoutMode;
  setMode: (v: FlyoutMode) => void;
}): EuiContainedStepProps => {
  // radio id has to be unique so that the component works even if appears twice in DOM
  const radioSuffix = 'installation_mode_agent_selection';

  const onChangeCallback = (v: string) => {
    const value = v.split('_')[0];
    if (value === 'managed' || value === 'standalone') {
      setMode(value);
    }
  };

  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepInstallType', {
      defaultMessage: 'Enroll in Fleet?',
    }),
    children: (
      <EuiRadioGroup
        options={[
          {
            id: `managed_${radioSuffix}`,
            label: (
              <FormattedMessage
                data-test-subj="agentFlyoutManagedRadioButtons"
                id="xpack.fleet.agentFlyout.managedRadioOption"
                defaultMessage="{managed} – Enroll in Elastic Agent in Fleet to automatically deploy updates and centrally manage the agent."
                values={{
                  managed: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.agentFlyout.managedMessage"
                        defaultMessage="Enroll in Fleet (recommended)"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
          {
            id: `standalone_${radioSuffix}`,
            label: (
              <FormattedMessage
                data-test-subj="agentFlyoutStandaloneRadioButtons"
                id="xpack.fleet.agentFlyout.standaloneRadioOption"
                defaultMessage="{standaloneMessage} – Run an Elastic Agent standalone to configure and update the agent manually on the host where the agent is installed."
                values={{
                  standaloneMessage: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.agentFlyout.standaloneMessage"
                        defaultMessage="Run standalone"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
        ]}
        idSelected={`${mode}_${radioSuffix}`}
        onChange={onChangeCallback}
        name={`radio group ${radioSuffix}`}
      />
    ),
  };
};

export const InstallManagedAgentStep = ({
  selectedApiKeyId,
  apiKeyData,
  fleetServerHosts,
  isK8s,
}: {
  fleetServerHosts: string[];
  selectedApiKeyId?: string;
  apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
  isK8s?: string;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your host',
    }),
    children: selectedApiKeyId && apiKeyData && (
      <ManualInstructions
        apiKey={apiKeyData.item}
        fleetServerHosts={fleetServerHosts}
        isK8s={isK8s}
      />
    ),
  };
};

export const ConfigureStandaloneAgentStep = ({
  isK8s,
  selectedPolicyId,
  yaml,
  downloadLink,
}: {
  isK8s: string;
  selectedPolicyId?: string;
  yaml: string;
  downloadLink: string;
}): EuiContainedStepProps => {
  const policyMsg =
    isK8s === 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.stepConfigureAgentDescriptionk8s"
        defaultMessage="Copy or download the Kubernetes manifest inside the Kubernetes cluster. Modify {ESUsernameVariable} and {ESPasswordVariable} in the Daemonset environment variables and apply the manifest."
        values={{
          ESUsernameVariable: <EuiCode>ES_USERNAME</EuiCode>,
          ESPasswordVariable: <EuiCode>ES_PASSWORD</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.stepConfigureAgentDescription"
        defaultMessage="Copy this policy to the {fileName} on the host where the Elastic Agent is installed. Modify {ESUsernameVariable} and {ESPasswordVariable} in the {outputSection} section of {fileName} to use your Elasticsearch credentials."
        values={{
          fileName: <EuiCode>elastic-agent.yml</EuiCode>,
          ESUsernameVariable: <EuiCode>ES_USERNAME</EuiCode>,
          ESPasswordVariable: <EuiCode>ES_PASSWORD</EuiCode>,
          outputSection: <EuiCode>outputs</EuiCode>,
        }}
      />
    );

  const downloadMsg =
    isK8s === 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadPolicyButtonk8s"
        defaultMessage="Download Manifest"
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadPolicyButton"
        defaultMessage="Download Policy"
      />
    );
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigureAgentTitle', {
      defaultMessage: 'Configure the agent',
    }),
    children: (
      <>
        <EuiText>
          <>{policyMsg}</>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={yaml}>
                {(copy) => (
                  <EuiButton onClick={copy} iconType="copyClipboard">
                    <FormattedMessage
                      id="xpack.fleet.agentEnrollment.copyPolicyButton"
                      defaultMessage="Copy to clipboard"
                    />
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="download" href={downloadLink} isDisabled={!downloadLink}>
                <>{downloadMsg}</>
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="yaml" style={{ maxHeight: 300 }} fontSize="m">
            {yaml}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  };
};

export const InstallStandaloneAgentStep = ({
  installCommand,
  isK8s,
  selectedPolicyId,
}: {
  installCommand: CommandsByPlatform;
  isK8s: string;
  selectedPolicyId?: string;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your host',
    }),
    children: (
      <>
        <InstallationMessage />
        <PlatformSelector
          linuxCommand={installCommand.linux}
          macCommand={installCommand.mac}
          windowsCommand={installCommand.windows}
          linuxDebCommand={installCommand.deb}
          linuxRpmCommand={installCommand.rpm}
          isK8s={isK8s === 'IS_KUBERNETES'}
        />
      </>
    ),
  };
};

export const AgentEnrollmentConfirmationStep = ({
  selectedPolicyId,
  troubleshootLink,
  onClickViewAgents,
  agentCount,
  agentEnrolled,
  setAgentEnrollment,
}: {
  selectedPolicyId?: string;
  troubleshootLink: string;
  onClickViewAgents: () => void;
  agentCount: number;
  agentEnrolled: boolean;
  setAgentEnrollment: (v: boolean) => void;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepAgentEnrollmentConfirmation', {
      defaultMessage: 'Confirm agent Enrollment',
    }),
    children: (
      <ConfirmAgentEnrollment
        policyId={selectedPolicyId}
        troubleshootLink={troubleshootLink}
        onClickViewAgents={onClickViewAgents}
        agentCount={agentCount}
        agentEnrolled={agentEnrolled}
        setAgentEnrollment={setAgentEnrollment}
      />
    ),
    status: !agentEnrolled ? 'incomplete' : 'complete',
  };
};

export const IncomingDataConfirmationStep = ({
  agentsIds,
  installedPolicy,
  agentDataConfirmed,
  setAgentDataConfirmed,
}: {
  agentsIds: string[];
  installedPolicy?: InstalledIntegrationPolicy;
  agentDataConfirmed: boolean;
  setAgentDataConfirmed: (v: boolean) => void;
}): EuiContainedStepProps => {
  return {
    title: !agentDataConfirmed
      ? i18n.translate('xpack.fleet.agentEnrollment.stepConfirmIncomingData', {
          defaultMessage: 'Confirm incoming data',
        })
      : i18n.translate('xpack.fleet.agentEnrollment.stepConfirmIncomingData.completed', {
          defaultMessage: 'Incoming data confirmed',
        }),
    children: (
      <ConfirmIncomingData
        agentsIds={agentsIds}
        installedPolicy={installedPolicy}
        agentDataConfirmed={agentDataConfirmed}
        setAgentDataConfirmed={setAgentDataConfirmed}
      />
    ),
    status: !agentDataConfirmed ? 'loading' : 'complete',
  };
};
