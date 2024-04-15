/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import type { ActionStatus, AgentPolicy } from '../../../../../types';

const MAX_VIEW_AGENTS_COUNT = 1000;

export const ViewAgentsButton: React.FunctionComponent<{
  action: ActionStatus;
  onClickViewAgents: (action: ActionStatus) => void;
  agentPolicies?: AgentPolicy[];
}> = ({ action, onClickViewAgents, agentPolicies }) => {
  const isDisabled = useMemo(() => {
    if (action.type !== 'POLICY_CHANGE') {
      return action.nbAgentsActionCreated > MAX_VIEW_AGENTS_COUNT;
    }

    const actionPolicyId = action.actionId.split(':')[0];
    return agentPolicies?.find((agentPolicy) => agentPolicy.id === actionPolicyId)?.agents === 0;
  }, [action, agentPolicies]);

  if (action.type === 'UPDATE_TAGS') {
    return null;
  }

  const button = (
    <EuiButtonEmpty
      size="m"
      onClick={() => onClickViewAgents(action)}
      flush="left"
      data-test-subj="agentActivityFlyout.viewAgentsButton"
      disabled={isDisabled}
    >
      <FormattedMessage
        id="xpack.fleet.agentActivityFlyout.viewAgentsButton"
        defaultMessage="View Agents"
      />
    </EuiButtonEmpty>
  );

  if (action.type !== 'POLICY_CHANGE' && !isDisabled) {
    return button;
  }

  if (action.type === 'POLICY_CHANGE') {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.fleet.agentActivityFlyout.viewAgentsButtonPolicyChangeTooltip"
            defaultMessage="View agents currently assigned to this policy"
          />
        }
      >
        {button}
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.fleet.agentActivityFlyout.viewAgentsButtonDisabledMaxTooltip"
          defaultMessage="The view agents feature is only available for action impacting less than {agentCount} agents"
          values={{
            agentCount: MAX_VIEW_AGENTS_COUNT,
          }}
        />
      }
    >
      {button}
    </EuiToolTip>
  );
};
