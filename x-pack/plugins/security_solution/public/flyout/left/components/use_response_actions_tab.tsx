/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComment } from '@elastic/eui';
import { map } from 'lodash';
import { FormattedRelative } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../common/components/event_details/types';
import { expandDottedObject } from '../../../common/utils/alerts';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { LogsEndpointAction, ActionDetails } from '../../../../common/endpoint/types';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import {
  useGetAutomatedActionList,
  useGetAutomatedActionResponseList,
} from '../../../management/hooks/response_actions/use_get_automated_action_list';

// check types, because at the top level it's called EcsSecurityExtension
export const useResponseActionsTab = (rawEventData: RawEventData) => {
  const {
    // @ts-expect-error adjust type
    services: { osquery },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');
  const expandedEventFieldsObject = rawEventData
    ? (expandDottedObject(rawEventData.fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const shouldEarlyReturn = !rawEventData || !responseActionsEnabled || !responseActions;
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
            ecsData={expandedEventFieldsObject}
          />
        );
      }
      if (item && 'EndpointActions' in item && item?.EndpointActions.input_type === 'endpoint') {
        return <EndpointResponseActionResults action={item} ruleName={ruleName?.[0]} />;
      }
    });
  };

  return isFetched && totalItemCount ? renderItems() : null;
};

interface EndpointResponseActionResultsProps {
  action: LogsEndpointAction;
  ruleName?: string;
}

// TODO add i18n an move outside of this file
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
