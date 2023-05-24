/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { LogsOsqueryAction } from '@kbn/osquery-plugin/common/types/osquery_action';
import { EndpointResponseActionResults } from './endpoint_action_results';
import type {
  LogsEndpointAction,
  LogsEndpointActionWithHosts,
} from '../../../../common/endpoint/types';
import { useKibana } from '../../lib/kibana';

interface ResponseActionsResultsProps {
  actions: Array<LogsEndpointActionWithHosts | LogsOsqueryAction>;
  ruleName?: string[];
  ecsData: Ecs;
}

export const ResponseActionsResults = React.memo(
  ({ actions, ruleName, ecsData }: ResponseActionsResultsProps) => {
    const {
      services: { osquery },
    } = useKibana();
    const { OsqueryResult } = osquery;

    return (
      <>
        {actions.map((action) => {
          if (isOsquery(action)) {
            const actionId = action.action_id;
            const queryId = action.queries[0].id;
            const startDate = action['@timestamp'];

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
          if (isEndpoint(action)) {
            return (
              <EndpointResponseActionResults
                action={action}
                key={action.EndpointActions.action_id}
              />
            );
          }
          return null;
        })}
      </>
    );
  }
);

ResponseActionsResults.displayName = 'ResponseActionsResults';

const isOsquery = (item: LogsEndpointAction | LogsOsqueryAction): item is LogsOsqueryAction => {
  return item && 'input_type' in item && item?.input_type === 'osquery';
};
const isEndpoint = (item: LogsEndpointAction | LogsOsqueryAction): item is LogsEndpointAction => {
  return item && 'EndpointActions' in item && item?.EndpointActions.input_type === 'endpoint';
};
