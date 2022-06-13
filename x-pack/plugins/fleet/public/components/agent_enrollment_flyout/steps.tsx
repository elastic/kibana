/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCopy,
  EuiCodeBlock,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';
import semverPatch from 'semver/functions/patch';

import type { AgentPolicy } from '../../types';
import { useGetSettings, useKibanaVersion, useStartServices } from '../../hooks';

import { agentPolicyRouteService } from '../../../common';

import { sendGetK8sManifest } from '../../hooks/use_request/k8s';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';
import { SelectCreateAgentPolicy } from './agent_policy_select_create';

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
  setSelectedPolicyId,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  excludeFleetServer,
  refreshAgentPolicies,
}: {
  agentPolicies: AgentPolicy[];
  setSelectedPolicyId?: (policyId?: string) => void;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId?: (key?: string) => void;
  excludeFleetServer?: boolean;
  refreshAgentPolicies: () => void;
}) => {
  // storing the created agent policy id as the child component is being recreated
  const [policyId, setPolicyId] = useState<string | undefined>(undefined);
  const regularAgentPolicies = useMemo(() => {
    return agentPolicies.filter(
      (policy) =>
        policy && !policy.is_managed && (!excludeFleetServer || !policy.is_default_fleet_server)
    );
  }, [agentPolicies, excludeFleetServer]);

  const onAgentPolicyChange = useCallback(
    async (key?: string, policy?: AgentPolicy) => {
      if (policy) {
        refreshAgentPolicies();
      }
      if (setSelectedPolicyId) {
        setSelectedPolicyId(key);
        setPolicyId(key);
      }
    },
    [setSelectedPolicyId, refreshAgentPolicies]
  );

  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepChooseAgentPolicyTitle', {
      defaultMessage: 'What type of host are you adding?',
    }),
    children: (
      <>
        <SelectCreateAgentPolicy
          agentPolicies={regularAgentPolicies}
          withKeySelection={setSelectedAPIKeyId ? true : false}
          selectedApiKeyId={selectedApiKeyId}
          onKeyChange={setSelectedAPIKeyId}
          onAgentPolicyChange={onAgentPolicyChange}
          excludeFleetServer={excludeFleetServer}
          policyId={policyId}
        />
      </>
    ),
  };
};

export const AgentEnrollmentKeySelectionStep = ({
  agentPolicy,
  selectedApiKeyId,
  setSelectedAPIKeyId,
}: {
  agentPolicy: AgentPolicy;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId: (key?: string) => void;
}) => {
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
              agentPolicyName: <strong>{agentPolicy.name}</strong>,
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
        <AdvancedAgentAuthenticationSettings
          agentPolicyId={agentPolicy.id}
          selectedApiKeyId={selectedApiKeyId}
          initialAuthenticationSettingsOpen
          onKeyChange={setSelectedAPIKeyId}
        />
      </>
    ),
  };
};
