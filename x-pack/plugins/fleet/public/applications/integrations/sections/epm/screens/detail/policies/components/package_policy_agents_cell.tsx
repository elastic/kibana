/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { LinkedAgentCount } from '../../../../../../components';

export const PackagePolicyAgentsCell = ({
  agentPolicyId,
  agentCount = 0,
  onAddAgent,
}: {
  agentPolicyId: string;
  agentCount?: number;
  onAddAgent: () => void;
}) => {
  if (agentCount > 0) {
    return (
      <LinkedAgentCount
        count={agentCount}
        agentPolicyId={agentPolicyId}
        className="eui-textTruncate"
      />
    );
  }

  return (
    <EuiButton iconType="plusInCircle" data-test-subj="addAgentButton" onClick={onAddAgent}>
      <FormattedMessage
        id="xpack.fleet.epm.packageDetails.integrationList.addAgent"
        defaultMessage="Add agent"
      />
    </EuiButton>
  );
};
