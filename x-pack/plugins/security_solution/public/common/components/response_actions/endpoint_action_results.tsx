/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { ActionDetails } from '../../../../common/endpoint/types/actions';
import { useUserPrivileges } from '../user_privileges';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import { ENDPOINT_COMMANDS } from '../event_details/translations';
import { ResponseActionsEmptyPrompt } from './response_actions_empty_prompt';

interface EndpointResponseActionResultsProps {
  action: ActionDetails;
  ruleName?: string;
}

export const EndpointResponseActionResults = ({
  action,
  ruleName,
}: EndpointResponseActionResultsProps) => {
  const {
    endpointPrivileges: { canAccessEndpointActionsLogManagement },
  } = useUserPrivileges();

  const eventText = useMemo(() => {
    return getCommentText(action);
  }, [action]);

  const hostName: string = useMemo(
    // we want to get the first and only hostname
    () => action.hosts[action.agents[0]]?.name ?? '-',
    [action.agents, action.hosts]
  );

  return (
    <EuiComment
      username={ruleName}
      timestamp={<FormattedRelative value={action.startedAt} />}
      event={eventText}
      data-test-subj={'endpoint-results-comment'}
    >
      {canAccessEndpointActionsLogManagement ? (
        action ? (
          <ActionsLogExpandedTray action={action} data-test-subj={`response-results-${hostName}`} />
        ) : (
          <EuiLoadingSpinner />
        )
      ) : (
        <ResponseActionsEmptyPrompt type="endpoint" />
      )}
    </EuiComment>
  );
};

const getCommentText = (action: ActionDetails): string => {
  if (action.errors?.length) {
    return ENDPOINT_COMMANDS.failed(action.command);
  }
  if (action.status === 'pending') {
    return ENDPOINT_COMMANDS.pending(action.command);
  }
  if (action.status === 'successful') {
    return ENDPOINT_COMMANDS.executed(action.command);
  }

  return ENDPOINT_COMMANDS.tried(action.command);
};
