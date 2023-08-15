/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { LogsOsqueryAction } from '@kbn/osquery-plugin/common/types/osquery_action';
import type { Ecs } from '@kbn/cases-plugin/common';
import { EuiSpacer } from '@elastic/eui';
import type { IValidatedEvent } from '@kbn/event-log-plugin/generated/schemas';
import { EndpointResponseActionResults } from './endpoint_action_results';
import type {
  LogsEndpointAction,
  LogsEndpointActionWithHosts,
} from '../../../../common/endpoint/types';
import { useKibana } from '../../lib/kibana';
import { SentinelOneActionResult } from './sentinelone';
import type { SentinelOneAction } from './sentinelone/types';

interface ResponseActionsResultsProps {
  actions: Array<LogsEndpointActionWithHosts | LogsOsqueryAction>;
  ruleName?: string;
  ecsData?: Ecs | null;
}

export const ResponseActionsResults = React.memo(
  ({ actions, ruleName, ecsData }: ResponseActionsResultsProps) => {
    const {
      services: { osquery },
    } = useKibana();
    const { OsqueryResult } = osquery;

    const getAction = useCallback(
      (action: LogsEndpointActionWithHosts | LogsOsqueryAction | SentinelOneAction) => {
        if (isOsquery(action)) {
          const actionId = action.action_id;
          const startDate = action['@timestamp'];

          return (
            <OsqueryResult
              key={actionId}
              actionId={actionId}
              startDate={startDate}
              ruleName={ruleName}
              ecsData={ecsData}
            />
          );
        }
        if (isEndpoint(action)) {
          return (
            <EndpointResponseActionResults
              action={action}
              ruleName={ruleName}
              key={action.EndpointActions.action_id}
            />
          );
        }
        if (isSentinelOne(action)) {
          const actionData = action?.kibana?.action?.execution?.sentinelone;

          return (
            <SentinelOneActionResult
              timestamp={action?.['@timestamp']}
              params={actionData?.params}
              data={actionData?.data}
            />
          );
        }
        return null;
      },
      [OsqueryResult, ecsData, ruleName]
    );

    return (
      <>
        {actions.map((action) => {
          return (
            <>
              <EuiSpacer size="s" />
              {getAction(action)}
              <EuiSpacer size="s" />
            </>
          );
        })}
      </>
    );
  }
);

ResponseActionsResults.displayName = 'ResponseActionsResults';

const isOsquery = (
  item: LogsEndpointAction | LogsOsqueryAction | IValidatedEvent
): item is LogsOsqueryAction => {
  return !!(item && 'input_type' in item && item?.input_type === 'osquery');
};
const isEndpoint = (
  item: LogsEndpointAction | LogsOsqueryAction | IValidatedEvent
): item is LogsEndpointAction => {
  return !!(item && 'EndpointActions' in item && item?.EndpointActions?.input_type === 'endpoint');
};
const isSentinelOne = (
  item: LogsEndpointAction | LogsOsqueryAction | IValidatedEvent
): item is SentinelOneAction => {
  return !!(item && 'kibana' in item && item.kibana?.action?.execution?.sentinelone);
};
