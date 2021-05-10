/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import type { AgentPolicy, PackagePolicy } from '../../../../types';
import { sendGetOneAgentPolicy } from '../../../../hooks';
import { FLEET_SERVER_PACKAGE } from '../../../../constants';

import { EnrollmentStepAgentPolicy } from './agent_policy_selection';

export const DownloadStep = () => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentTitle', {
      defaultMessage: 'Download the Elastic Agent to your host',
    }),
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.downloadDescription"
            defaultMessage="You can download the agent binaries and their verification signatures from the Elastic Agent download page."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiButton
          href="https://ela.st/download-elastic-agent"
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
  setSelectedAPIKeyId,
  setSelectedPolicyId,
  setIsFleetServerPolicySelected,
  excludeFleetServer,
}: {
  agentPolicies?: AgentPolicy[];
  setSelectedAPIKeyId?: (key: string) => void;
  setSelectedPolicyId?: (policyId: string) => void;
  setIsFleetServerPolicySelected?: (selected: boolean) => void;
  excludeFleetServer?: boolean;
}) => {
  const regularAgentPolicies = Array.isArray(agentPolicies)
    ? agentPolicies.filter(
        (policy) =>
          policy && !policy.is_managed && (!excludeFleetServer || !policy.is_default_fleet_server)
      )
    : [];

  const onAgentPolicyChange = useCallback(
    async (policyId: string) => {
      if (setSelectedPolicyId) {
        setSelectedPolicyId(policyId);
      }
      if (setIsFleetServerPolicySelected) {
        const agentPolicyRequest = await sendGetOneAgentPolicy(policyId);
        if (
          agentPolicyRequest.data?.item &&
          (agentPolicyRequest.data.item.package_policies as PackagePolicy[]).some(
            (packagePolicy) => packagePolicy.package?.name === FLEET_SERVER_PACKAGE
          )
        ) {
          setIsFleetServerPolicySelected(true);
        } else {
          setIsFleetServerPolicySelected(false);
        }
      }
    },
    [setIsFleetServerPolicySelected, setSelectedPolicyId]
  );

  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepChooseAgentPolicyTitle', {
      defaultMessage: 'Choose an agent policy',
    }),
    children: (
      <EnrollmentStepAgentPolicy
        agentPolicies={regularAgentPolicies}
        withKeySelection={setSelectedAPIKeyId ? true : false}
        onKeyChange={setSelectedAPIKeyId}
        onAgentPolicyChange={onAgentPolicyChange}
        excludeFleetServer={excludeFleetServer}
      />
    ),
  };
};
