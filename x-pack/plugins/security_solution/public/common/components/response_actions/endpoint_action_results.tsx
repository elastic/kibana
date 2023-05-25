/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import type { LogsEndpointActionWithHosts } from '../../../../common/endpoint/types/actions';
import { useUserPrivileges } from '../user_privileges';
import { useGetAutomatedActionResponseList } from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_COMMANDS } from '../event_details/translations';
import { ResponseActionsEmptyPrompt } from './response_actions_empty_prompt';

interface EndpointResponseActionResultsProps {
  action: LogsEndpointActionWithHosts;
  isNewFlyout?: boolean;
}

const StyledEuiComment = styled(EuiComment)`
  figure {
    background-color: ${(props: { isNewFlyout?: boolean }) =>
      props.isNewFlyout ? 'white' : 'transparent'};
  }
`;

export const EndpointResponseActionResults = ({
  action,
  isNewFlyout,
}: EndpointResponseActionResultsProps) => {
  const { rule, agent } = action;
  const { action_id: actionId, expiration } = action.EndpointActions;
  const {
    endpointPrivileges: { canReadActionsLogManagement },
  } = useUserPrivileges();

  const [isLive, setIsLive] = useState(true);
  const { data: expandedAction } = useGetAutomatedActionResponseList(
    { actionId, expiration, agent },
    { enabled: canReadActionsLogManagement, action, isLive }
  );

  useEffect(() => {
    setIsLive(() => {
      if (!expandedAction) {
        return true;
      }
      return !expandedAction.errors?.length && expandedAction.status === 'pending';
    });
  }, [expandedAction]);

  const eventText = getCommentText(action.EndpointActions.data.command);

  const hostName = useMemo(
    () => expandedAction?.hosts[expandedAction?.agents[0]].name,
    [expandedAction?.agents, expandedAction?.hosts]
  );

  return (
    <>
      <EuiSpacer size="s" />
      <StyledEuiComment
        isNewFlyout={isNewFlyout}
        username={rule?.name}
        timestamp={<FormattedRelative value={action['@timestamp']} />}
        event={eventText}
        data-test-subj={'endpoint-results-comment'}
      >
        {canReadActionsLogManagement ? (
          expandedAction ? (
            <ActionsLogExpandedTray
              action={expandedAction}
              data-test-subj={`response-results-${hostName}`}
            />
          ) : (
            <EuiLoadingSpinner />
          )
        ) : (
          <ResponseActionsEmptyPrompt type="endpoint" />
        )}
      </StyledEuiComment>
      <EuiSpacer size="s" />
    </>
  );
};

const getCommentText = (command: ResponseActionsApiCommandNames): string => {
  if (command === 'isolate') {
    return ENDPOINT_COMMANDS.isolated;
  }
  if (command === 'unisolate') {
    return ENDPOINT_COMMANDS.released;
  }
  return ENDPOINT_COMMANDS.generic(command);
};
