/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import type { ActionStatus } from '../../../../../types';

const MAX_VIEW_AGENTS_COUNT = 1000;

export const ViewAgentsButton: React.FunctionComponent<{
  action: ActionStatus;
  onClickViewAgents: (action: ActionStatus) => void;
}> = ({ action, onClickViewAgents }) => {
  if (action.type === 'UPDATE_TAGS') {
    return null;
  }

  const button = (
    <EuiButtonEmpty
      size="m"
      onClick={() => onClickViewAgents(action)}
      flush="left"
      data-test-subj="agentActivityFlyout.viewAgentsButton"
      disabled={action.nbAgentsActionCreated > MAX_VIEW_AGENTS_COUNT}
    >
      <FormattedMessage
        id="xpack.fleet.agentActivityFlyout.viewAgentsButton"
        defaultMessage="View Agents"
      />
    </EuiButtonEmpty>
  );

  if (action.nbAgentsActionCreated <= MAX_VIEW_AGENTS_COUNT) {
    return button;
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.fleet.agentActivityFlyout.viewAgentsButtonDisabledMaxTooltip"
          defaultMessage="The view agents feature is only available for action impacting less then {agentCount} agents"
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
