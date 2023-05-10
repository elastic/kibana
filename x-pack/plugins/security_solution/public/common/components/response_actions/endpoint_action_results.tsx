/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React from 'react';
import type { ActionDetails, LogsEndpointAction } from '../../../../common/endpoint/types';
import { useGetAutomatedActionResponseList } from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_COMMANDS } from '../event_details/translations';

interface EndpointResponseActionResultsProps {
  action: LogsEndpointAction;
  ruleName?: string;
}

export const EndpointResponseActionResults = ({
  action,
  ruleName,
}: EndpointResponseActionResultsProps) => {
  const { action_id: actionId, expiration } = action.EndpointActions;
  const { data: responseData } = useGetAutomatedActionResponseList({ actionId, expiration });

  const eventText = getCommentText(action.EndpointActions.data.command);
  return (
    <EuiComment
      username={ruleName}
      timestamp={<FormattedRelative value={action['@timestamp']} />}
      event={eventText}
      data-test-subj={'endpoint-results-comment'}
    >
      <ActionsLogExpandedTray
        action={
          {
            ...action.EndpointActions.data,
            ...(action.error ? { errors: [action.error.message] } : {}),
            startedAt: action['@timestamp'],
            ...responseData,
            // Did not type this strictly, because we're still waiting for UI, but this component will not be used in the long run
          } as unknown as ActionDetails
        }
      />
    </EuiComment>
  );
};

const getCommentText = (command: ResponseActionsApiCommandNames) => {
  if (command === 'isolate') {
    return ENDPOINT_COMMANDS.isolated;
  }
  if (command === 'unisolate') {
    return ENDPOINT_COMMANDS.released;
  }
  return `executed command ${command}`;
};
