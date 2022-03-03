/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';
import semverPatch from 'semver/functions/patch';

import type { AgentPolicy } from '../../types';
import { useKibanaVersion } from '../../hooks';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';
import { SelectCreateAgentPolicy } from './agent_policy_select_create';

export const DownloadStep = (hasFleetServer: boolean) => {
  const kibanaVersion = useKibanaVersion();
  const kibanaVersionURLString = useMemo(
    () =>
      `${semverMajor(kibanaVersion)}-${semverMinor(kibanaVersion)}-${semverPatch(kibanaVersion)}`,
    [kibanaVersion]
  );
  const title = hasFleetServer
    ? i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentForFleetServerTitle', {
        defaultMessage: 'Download the Fleet Server to a centralized host',
      })
    : i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentTitle', {
        defaultMessage: 'Download the Elastic Agent to your host',
      });
  const downloadDescription = hasFleetServer ? (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescriptionForFleetServer"
      defaultMessage="Fleet Server runs on an Elastic Agent. Install this agent on a centralized host so that other hosts you wish to monitor can connect to it. In production, we recommend using one or more dedicated hosts. You can download the Elastic Agent binaries and verification signatures from Elastic’s download page."
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescription"
      defaultMessage="Install the Elastic Agent on the hosts you wish to monitor. Do not install this agent policy on a host containing Fleet Server. You can download the Elastic Agent binaries and verification signatures from Elastic’s download page."
    />
  );
  return {
    title,
    children: (
      <>
        <EuiText>{downloadDescription}</EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.downloadUseLinuxInstaller"
            defaultMessage="Linux users: We recommend the installer (TAR) over system packages (RPM/DEB) because it lets you upgrade your agent in Fleet."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiButton
          href={`https://www.elastic.co/downloads/past-releases/elastic-agent-${kibanaVersionURLString}`}
          target="_blank"
          iconSide="right"
          iconType="popout"
        >
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.downloadLink"
            defaultMessage="Go to download page"
          />
        </EuiButton>
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
