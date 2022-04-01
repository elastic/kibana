/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import { ConfirmAgentEnrollment } from '../confirm_agent_enrollment';

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
