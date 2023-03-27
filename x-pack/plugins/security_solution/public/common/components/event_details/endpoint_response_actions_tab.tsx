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
  alertIds?: string[];
}) => {
  const {
    services: { osquery },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');

  const { data: automatedList, isFetched } = useGetAutomatedActionList({
    alertIds,
    withRuleActions: true,
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
      if (item.input_type === 'osquery') {
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
      if (item.EndpointActions.input_type === 'endpoint') {
        console.log({ item });
        return <EndpointResponseActionResults action={item} ruleName={ruleName?.[0]} />;
      }
      // RESPONSES
      // if (item.action_input_type === 'osquery') {
      //   const actionId = item.action_id;
      //   const queryId = item.action_data.id;
      //   const startDate = item['@timestamp'];
      //
      //   return (
      //     <OsqueryResult
      //       key={actionId}
      //       actionId={actionId}
      //       queryId={queryId}
      //       startDate={startDate}
      //       ruleName={ruleName}
      //       ecsData={ecsData}
      //     />
      //   );
      // }
      // if (item.action_input_type === 'endpoint') {
      //   return <div>ENDPOINT ACTION: </div>;
      // }
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

const EndpointResponseActionResults = ({ action, ruleName }) => {
  const { action_id: actionId, expiration } = action.EndpointActions;
  console.log({ action });
  const response = useGetAutomatedActionResponseList({ actionId, expiration });

  return (
    <EuiComment
      username={ruleName}
      timestamp={<FormattedRelative value={action['@timestamp']} />}
      event={`executed command ${action.EndpointActions?.data.command}`}
      data-test-subj={'endpoint-results-comment'}
    >
      <ActionsLogExpandedTray action={{ ...action.EndpointActions.data, ...response?.data }} />
    </EuiComment>
  );
};
