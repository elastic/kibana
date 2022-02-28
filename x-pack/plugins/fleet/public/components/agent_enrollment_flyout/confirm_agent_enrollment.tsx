/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useGetAgentStatus } from '../../hooks';
import { AGENTS_PREFIX } from '../../constants';
interface Props {
  policyId: string;
  onClickViewAgents: () => void;
}

export const ConfirmAgentEnrollment: React.FunctionComponent<Props> = ({
  policyId,
  onClickViewAgents,
}) => {
  // Check the agents enrolled in the last 10 minutes
  const enrolledAt = 'now-10m';
  const kuery = `${AGENTS_PREFIX}.enrolled_at >= "${enrolledAt}"`;
  const agentStatusRequest = useGetAgentStatus({ kuery, policyId });
  const agentsCount = agentStatusRequest.data?.results?.total;

  if (!agentsCount) {
    return null;
  }

  return (
    <EuiCallOut
      data-test-subj="ConfirmAgentEnrollmentCallOut"
      title={i18n.translate('xpack.fleet.agentEnrollment.confirmation.title', {
        defaultMessage:
          '{agentsCount} {agentsCount, plural, one {agent has} other {agents have}} been enrolled.',
        values: {
          agentsCount,
        },
      })}
      color="success"
      iconType="check"
    >
      <EuiButton
        onClick={onClickViewAgents}
        color="success"
        data-test-subj="ConfirmAgentEnrollmentButton"
      >
        {i18n.translate('xpack.fleet.agentEnrollment.confirmation.button', {
          defaultMessage: 'View enrolled agents',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};
