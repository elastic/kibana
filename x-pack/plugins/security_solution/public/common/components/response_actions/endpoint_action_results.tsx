/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React from 'react';
import type { LogsEndpointAction } from '../../../../common/endpoint/types';
import { useGetAutomatedActionResponseList } from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_COMMANDS } from '../event_details/translations';

interface EndpointResponseActionResultsProps {
  action: LogsEndpointAction;
}

export const EndpointResponseActionResults = ({ action }: EndpointResponseActionResultsProps) => {
  const { rule, agent } = action;
  const { action_id: actionId, expiration } = action.EndpointActions;
  const { data: responseData } = useGetAutomatedActionResponseList({ actionId, expiration, agent });

  const eventText = getCommentText(action.EndpointActions.data.command);
  const expandedAction = combineAction(action, responseData);

  return (
    <EuiComment
      username={rule?.name}
      timestamp={<FormattedRelative value={action['@timestamp']} />}
      event={eventText}
      data-test-subj={'endpoint-results-comment'}
    >
      <ActionsLogExpandedTray action={expandedAction} />
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

const combineAction = (
  action: LogsEndpointAction,
  responseData: ReturnType<typeof useGetAutomatedActionResponseList>['data']
) => {
  const { rule } = action;
  const { parameters, alert_id: alertId, comment, command } = action.EndpointActions.data;

  const status = responseData?.isExpired
    ? 'failed'
    : responseData?.isCompleted
    ? responseData?.wasSuccessful
      ? 'successful'
      : 'failed'
    : 'pending';

  return {
    id: action.EndpointActions.action_id,
    agents: action.agent.id as string[],
    parameters,
    ...(alertId?.length ? { alertIds: alertId } : {}),
    ...(rule
      ? {
          ruleId: rule.id,
          ruleName: rule.name,
        }
      : {}),
    createdBy: action.rule?.name || 'unknown',
    comment,
    command,
    hosts: (action.agent.id as string[]).reduce(
      (acc: Record<string, { name: string }>, agentId: string) => {
        acc[agentId] = {
          name: '',
        };
        return acc;
      },
      {}
    ),
    startedAt: action['@timestamp'],
    completedAt: responseData?.completedAt,
    isCompleted: !!responseData?.isCompleted,
    isExpired: !!responseData?.isExpired,
    wasSuccessful: !!responseData?.isCompleted,
    status: status as 'pending' | 'successful' | 'failed',
    agentState: {},
    errors: action.error ? [action.error.message as string] : undefined,
  };
};
