/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Output } from '../../../../types';
import type { useConfirmModal } from '../../hooks/use_confirm_modal';
import { getAgentAndPolicyCountForOutput } from '../../services/agent_and_policies_count';

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.updateOutput.confirmModalTitle"
    defaultMessage="Save and deploy changes?"
  />
);

interface ConfirmDescriptionProps {
  output: Output;
  agentCount: number;
  agentPolicyCount: number;
}

const ConfirmDescription: React.FunctionComponent<ConfirmDescriptionProps> = ({
  output,
  agentCount,
  agentPolicyCount,
}) => (
  <FormattedMessage
    id="xpack.fleet.settings.updateOutput.confirmModalText"
    defaultMessage="This action will update {outputName} output. It will update {policies} and {agents}. This action can not be undone. Are you sure you wish to continue?"
    values={{
      outputName: <strong>{output.name}</strong>,
      agents: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.updateOutput.agentsCount"
            defaultMessage="{agentCount, plural, one {# agent} other {# agents}}"
            values={{
              agentCount,
            }}
          />
        </strong>
      ),
      policies: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.updateOutput.agentPolicyCount"
            defaultMessage="{agentPolicyCount, plural, one {# agent policy} other {# agent policies}}"
            values={{
              agentPolicyCount,
            }}
          />
        </strong>
      ),
    }}
  />
);

export async function confirmUpdate(
  output: Output,
  confirm: ReturnType<typeof useConfirmModal>['confirm']
) {
  const { agentCount, agentPolicyCount } = await getAgentAndPolicyCountForOutput(output);
  return confirm(
    <ConfirmTitle />,
    <ConfirmDescription
      agentCount={agentCount}
      agentPolicyCount={agentPolicyCount}
      output={output}
    />
  );
}
