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
import { EndpointResponseActionResults } from './endpoint_action_results';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { useKibana } from '../../lib/kibana';

interface ResponseActionsResultsProps {
  actions: Array<ActionDetails | LogsOsqueryAction>;
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
      (action: ActionDetails | LogsOsqueryAction) => {
        if (isOsquery(action)) {
          const actionId = action.action_id;
          const startDate = action['@timestamp'];

          return (
            <OsqueryResult
              actionId={actionId}
              startDate={startDate}
              ruleName={ruleName}
              ecsData={ecsData}
            />
          );
        }
        if (isEndpoint(action)) {
          return <EndpointResponseActionResults action={action} ruleName={ruleName} />;
        }
        return null;
      },
      [OsqueryResult, ecsData, ruleName]
    );

    return (
      <>
        {actions.map((action) => {
          const key = isEndpoint(action) ? action.id : action.action_id;

          return (
            <React.Fragment key={key}>
              <EuiSpacer size="s" />
              {getAction(action)}
              <EuiSpacer size="s" />
            </React.Fragment>
          );
        })}
      </>
    );
  }
);

ResponseActionsResults.displayName = 'ResponseActionsResults';

const isOsquery = (item: ActionDetails | LogsOsqueryAction): item is LogsOsqueryAction => {
  return !!(item && 'input_type' in item && item?.input_type === 'osquery');
};
const isEndpoint = (item: ActionDetails | LogsOsqueryAction): item is ActionDetails => {
  return 'agentType' in item && 'command' in item && 'agents' in item;
};
