/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiComment, EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { map } from 'lodash';
import { FormattedRelative } from '@kbn/i18n-react';
import type { LogsEndpointAction } from '../../../../common/endpoint/types';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import { useKibana } from '../../lib/kibana';
import {
  useGetAutomatedActionList,
  useGetAutomatedActionResponseList,
} from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { EventsViewType } from './event_details';
import * as i18n from './translations';

import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas/response_actions';
import type { ActionDetails } from '../../../../common/endpoint/types';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

export const useEndpointResponseActionsTab = ({
  responseActions,
  ruleName,
  ecsData,
  alertIds,
}: {
  ecsData?: Ecs;
  responseActions?: Array<{
    action_type_id: RESPONSE_ACTION_TYPES;
    params: Record<string, unknown>;
  }>;
  ruleName?: string[];
  alertIds: string[];
}) => {
  const {
    services: { osquery },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');

  const { data: automatedList, isFetched } = useGetAutomatedActionList({
    alertIds,
  });

  const { OsqueryResult } = osquery;

  const totalItemCount = useMemo(() => automatedList?.items?.length ?? 0, [automatedList]);

  if (!responseActionsEnabled) {
    return;
  }

  const endpointResponseActions = responseActions?.filter(
    (responseAction) => responseAction.action_type_id === RESPONSE_ACTION_TYPES.ENDPOINT
  );
  if (!endpointResponseActions?.length) {
    return;
  }

  const renderItems = () => {
    return map(automatedList?.items, (item) => {
      if (item && 'input_type' in item && item?.input_type === 'osquery') {
        const actionId = item.action_id;
        const queryId = item.queries[0].id;
        const startDate = item['@timestamp'];

        return (
          <OsqueryResult
            key={actionId}
            actionId={actionId}
            queryId={queryId}
            startDate={startDate}
            ruleName={ruleName}
            ecsData={ecsData}
          />
        );
      }
      if (item && 'EndpointActions' in item && item?.EndpointActions.input_type === 'endpoint') {
        return <EndpointResponseActionResults action={item} ruleName={ruleName?.[0]} />;
      }
    });
  };

  return {
    id: EventsViewType.endpointView,
    'data-test-subj': 'endpointViewTab',
    name: i18n.ENDPOINT_VIEW,
    append: (
      <EuiNotificationBadge data-test-subj="endpoint-actions-notification">
        {totalItemCount}
      </EuiNotificationBadge>
    ),
    content: (
      <>
        <EuiSpacer size="s" />
        <TabContentWrapper data-test-subj="endpointViewWrapper">
          {isFetched && totalItemCount ? renderItems() : null}
        </TabContentWrapper>
      </>
    ),
  };
};

interface EndpointResponseActionResultsProps {
  action: LogsEndpointAction;
  ruleName?: string;
}

const EndpointResponseActionResults = ({
  action,
  ruleName,
}: EndpointResponseActionResultsProps) => {
  const { action_id: actionId, expiration } = action.EndpointActions;
  const { data: responseData } = useGetAutomatedActionResponseList({ actionId, expiration });

  const eventText = useMemo(() => {
    const command = action.EndpointActions.data.command;
    if (command === 'isolate') {
      return 'isolated the host';
    }
    if (command === 'unisolate') {
      return 'released the host';
    }
    return `executed command ${command}`;
  }, [action.EndpointActions.data.command]);

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
            startedAt: action['@timestamp'],
            ...responseData,
          } as unknown as ActionDetails
        }
      />
    </EuiComment>
  );
};
