/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { ConfirmAgentEnrollment } from '../confirm_agent_enrollment';

const AgentEnrollmentPrePollInstructions: React.FC<{ troubleshootLink: string }> = ({
  troubleshootLink,
}) => {
  return (
    <EuiText>
      <FormattedMessage
        id="xpack.fleet.confirmIncomingDataWithPreview.prePollingInstructions"
        defaultMessage="After the agent starts up, the Elastic Stack listens for the agent and confirms the enrollment in Fleet. If you're having trouble connecting, check out the {link}."
        values={{
          link: (
            <EuiLink target="_blank" external href={troubleshootLink}>
              <FormattedMessage
                id="xpack.fleet.enrollmentInstructions.troubleshootingLink"
                defaultMessage="troubleshooting guide"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
};

export const AgentEnrollmentConfirmationStep = ({
  selectedPolicyId,
  troubleshootLink,
  onClickViewAgents,
  agentCount,
  showLoading,
  poll = true,
  isLongEnrollment = false,
  rootIntegrations = [],
  unprivilegedAgentsCount = 0,
}: {
  selectedPolicyId?: string;
  troubleshootLink: string;
  onClickViewAgents?: () => void;
  agentCount: number;
  poll?: boolean;
  showLoading?: boolean;
  isLongEnrollment?: boolean;
  rootIntegrations?: Array<{ name: string; title: string }>;
  unprivilegedAgentsCount?: number;
}): EuiContainedStepProps => {
  const isComplete = !!agentCount;
  return {
    title: isComplete
      ? i18n.translate('xpack.fleet.agentEnrollment.stepAgentEnrollmentConfirmationComplete', {
          defaultMessage: 'Agent enrollment confirmed',
        })
      : i18n.translate('xpack.fleet.agentEnrollment.stepAgentEnrollmentConfirmation', {
          defaultMessage: 'Confirm agent enrollment',
        }),
    children: (
      <>
        {rootIntegrations.length > 0 && unprivilegedAgentsCount > 0 ? (
          <>
            <EuiCallOut
              color="warning"
              iconType="warning"
              title={i18n.translate('xpack.fleet.agentEnrollmentCallout.unprivilegedAgentsTitle', {
                defaultMessage: 'Unprivileged agents enrolled',
              })}
            >
              <FormattedMessage
                id="xpack.fleet.agentEnrollmentCallout.unprivilegedAgentsMessage"
                defaultMessage="This agent policy has integrations that require Elastic Agents to have root privileges: {rootIntegrations}. There {unprivilegedAgentsCount, plural, one {is # agent} other {are # agents}} running in an unprivileged mode. To ensure that all data required by the integration can be collected, re-enroll the {unprivilegedAgentsCount, plural, one {agent} other {agents}} using an account with root privileges."
                values={{
                  rootIntegrations: rootIntegrations.map((item) => item.title).join(', '),
                  unprivilegedAgentsCount,
                }}
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        {!!isComplete || poll ? (
          <ConfirmAgentEnrollment
            policyId={selectedPolicyId}
            troubleshootLink={troubleshootLink}
            onClickViewAgents={onClickViewAgents}
            agentCount={agentCount}
            showLoading={!isComplete || showLoading}
            isLongEnrollment={isLongEnrollment}
          />
        ) : (
          <AgentEnrollmentPrePollInstructions troubleshootLink={troubleshootLink} />
        )}
      </>
    ),
    status: !isComplete ? 'incomplete' : 'complete',
  };
};
