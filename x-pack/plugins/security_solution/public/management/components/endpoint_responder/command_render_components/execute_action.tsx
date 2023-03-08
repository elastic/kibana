/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { ExecuteActionRequestBody } from '../../../../../common/endpoint/schema/actions';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ResponseActionExecuteOutputContent } from '../../../../../common/endpoint/types';
import { useSendExecuteEndpoint } from '../../../hooks/response_actions/use_send_execute_endpoint_request';
import type { ActionRequestComponentProps } from '../types';
import { parsedExecuteTimeout } from '../lib/utils';
import { ExecuteActionHostResponseOutput } from '../../endpoint_execute_action';

export const ExecuteActionResult = memo<
  ActionRequestComponentProps<{
    command: string;
    timeout?: string;
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendExecuteEndpoint();
  const actionRequestBody = useMemo<undefined | ExecuteActionRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;

    if (!endpointId) {
      return;
    }
    return {
      endpoint_ids: [endpointId],
      parameters: {
        command: command.args.args.command[0],
        timeout: parsedExecuteTimeout(command.args.args.timeout?.[0]),
      },
      comment: command.args.args?.comment?.[0],
    };
  }, [
    command.commandDefinition?.meta?.endpointId,
    command.args.args.command,
    command.args.args.timeout,
    command.args.args?.comment,
  ]);

  const { result, actionDetails: completedActionDetails } = useConsoleActionSubmitter<
    ExecuteActionRequestBody,
    ResponseActionExecuteOutputContent
  >({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'execute',
  });

  if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
    return result;
  }

  // Show results
  return (
    <ResultComponent
      data-test-subj="executeSuccess"
      showAs="success"
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.executeAction.successTitle',
        { defaultMessage: 'Command execution was successful.' }
      )}
    >
      <ExecuteActionHostResponseOutput
        action={completedActionDetails}
        agentId={command.commandDefinition?.meta?.endpointId}
        data-test-subj="consoleExecuteResponseOutput"
        textSize="s"
      />
    </ResultComponent>
  );
});
ExecuteActionResult.displayName = 'ExecuteActionResult';
