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
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type { LogsEndpointAction, ActionDetails } from '../../../../common/endpoint/types';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import { useKibana } from '../../lib/kibana';
import {
  useGetAutomatedActionList,
  useGetAutomatedActionResponseList,
} from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { EventsViewType } from './event_details';
import * as i18n from './translations';

import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import type { ExpandedEventFieldsObject, RawEventData } from './types';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

export const useResponseActionsTab = ({
  rawEventData,
  ecsData,
}: {
  ecsData?: Ecs;
  rawEventData: RawEventData;
}) => {
  const {
    services: { osquery, application },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');

  const expandedEventFieldsObject = rawEventData
    ? (expandDottedObject(rawEventData.fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const shouldEarlyReturn = !ecsData || !responseActionsEnabled || !responseActions;
  const alertId = rawEventData?._id ?? '';

  const { data: automatedList, isFetched } = useGetAutomatedActionList(
    {
      alertIds: [alertId],
    },
    { skip: shouldEarlyReturn }
  );

  const { OsqueryResult } = osquery;
  const ruleName = expandedEventFieldsObject?.kibana?.alert?.rule?.name;

  const totalItemCount = useMemo(() => automatedList?.items?.length ?? 0, [automatedList]);

  if (shouldEarlyReturn || !responseActions?.length) {
    return;
  }

  const canReadOsquery = !!application?.capabilities?.osquery?.read;

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
            canReadOsquery={canReadOsquery}
          />
        );
      }
      if (item && 'EndpointActions' in item && item?.EndpointActions.input_type === 'endpoint') {
        return <EndpointResponseActionResults action={item} ruleName={ruleName?.[0]} />;
      }
    });
  };

  return {
    id: EventsViewType.responseActionsView,
    'data-test-subj': 'responseActionsViewTab',
    name: i18n.RESPONSE_ACTIONS_VIEW,
    append: (
      <EuiNotificationBadge data-test-subj="response-actions-notification">
        {totalItemCount}
      </EuiNotificationBadge>
    ),
    content: (
      <>
        <EuiSpacer size="s" />
        <TabContentWrapper data-test-subj="responseActonsViewWrapper">
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
    return i18n.ENDPOINT_COMMANDS.isolated;
  }
  if (command === 'unisolate') {
    return i18n.ENDPOINT_COMMANDS.released;
  }
  return `executed command ${command}`;
};
