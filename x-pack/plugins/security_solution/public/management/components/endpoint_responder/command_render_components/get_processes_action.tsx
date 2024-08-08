/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { GetProcessesRequestBody } from '../../../../../common/api/endpoint';
import { RunningProcessesActionResults } from '../../running_processes_action_results';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { GetProcessesActionOutputContent } from '../../../../../common/endpoint/types';
import { useSendGetEndpointProcessesRequest } from '../../../hooks/response_actions/use_send_get_endpoint_processes_request';
import type { ActionRequestComponentProps } from '../types';

export const GetProcessesActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const { endpointId, agentType } = command.commandDefinition?.meta ?? {};
    const comment = command.args.args?.comment?.[0];
    const actionCreator = useSendGetEndpointProcessesRequest();

    const actionRequestBody = useMemo(() => {
      return endpointId
        ? {
            endpoint_ids: [endpointId],
            comment,
            agent_type: agentType,
          }
        : undefined;
    }, [endpointId, comment, agentType]);

    const { result, actionDetails: completedActionDetails } = useConsoleActionSubmitter<
      GetProcessesRequestBody,
      GetProcessesActionOutputContent
    >({
      ResultComponent,
      setStore,
      store,
      status,
      setStatus,
      actionCreator,
      actionRequestBody,
      dataTestSubj: 'getProcesses',
    });

    if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
      return result;
    }

    // Show results
    return (
      <ResultComponent data-test-subj="getProcessesSuccessCallout" showTitle={false}>
        <RunningProcessesActionResults
          action={completedActionDetails}
          data-test-subj="processesOutput"
        />
      </ResultComponent>
    );
  }
);
GetProcessesActionResult.displayName = 'GetProcessesActionResult';
