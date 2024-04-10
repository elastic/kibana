/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const AgentActivityBadge: React.FunctionComponent<{
  recentErrors: number;
  onClick: () => void;
}> = ({ recentErrors, onClick }) => {
  if (recentErrors === 0) {
    return null;
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.fleet.agentList.agentActivityBadge.tooltip"
          defaultMessage={`There ${
            recentErrors > 1 ? 'are' : 'is'
          } {recentErrors} new agent activity error${recentErrors > 1 ? 's' : ''}. Click to view.`}
          values={{
            recentErrors,
          }}
        />
      }
    >
      <EuiBadge
        color="warning"
        onClick={onClick}
        onClickAriaLabel="Open the Agent activity flyout"
        iconType="warning"
        iconOnClick={onClick}
        iconOnClickAriaLabel="Open the Agent activity flyout"
        data-test-subj="agentActivityBadge"
      >
        <FormattedMessage
          id="xpack.fleet.agentList.agentActivityBadge.label"
          defaultMessage="Review errors"
        />
      </EuiBadge>
    </EuiToolTip>
  );
};
