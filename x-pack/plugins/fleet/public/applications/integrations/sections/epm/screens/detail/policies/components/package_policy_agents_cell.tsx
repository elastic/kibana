/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { LinkedAgentCount, AddAgentHelpPopover } from '../../../../../../components';
import type { AgentPolicy } from '../../../../../../types';

const AddAgentButton = ({ onAddAgent }: { onAddAgent: () => void }) => (
  <EuiButton iconType="plusInCircle" data-test-subj="addAgentButton" onClick={onAddAgent} size="s">
    <FormattedMessage
      id="xpack.fleet.epm.packageDetails.integrationList.addAgent"
      defaultMessage="Add agent"
    />
  </EuiButton>
);

const AddAgentButtonWithPopover = ({ onAddAgent }: { onAddAgent: () => void }) => {
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(true);
  const onAddAgentCloseHelp = () => {
    setIsHelpOpen(false);
    onAddAgent();
  };
  const button = <AddAgentButton onAddAgent={onAddAgentCloseHelp} />;
  return (
    <AddAgentHelpPopover
      button={button}
      isOpen={isHelpOpen}
      closePopover={() => setIsHelpOpen(false)}
    />
  );
};

export const PackagePolicyAgentsCell = ({
  agentPolicy,
  agentCount = 0,
  onAddAgent,
  hasHelpPopover = false,
}: {
  agentPolicy: AgentPolicy;
  agentCount?: number;
  hasHelpPopover?: boolean;
  onAddAgent: () => void;
}) => {
  if (agentCount > 0 || agentPolicy.is_managed) {
    return (
      <LinkedAgentCount
        count={agentCount}
        agentPolicyId={agentPolicy.id}
        className="eui-textTruncate"
      />
    );
  }

  if (!hasHelpPopover) {
    return <AddAgentButton onAddAgent={onAddAgent} />;
  }

  return <AddAgentButtonWithPopover onAddAgent={onAddAgent} />;
};
