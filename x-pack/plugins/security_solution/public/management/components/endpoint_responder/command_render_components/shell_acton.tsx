/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ExecuteActionHostResponseOutputSimple } from '../../endpoint_execute_action/execute_action_host_response_simple';
import type { ExecuteActionRequestBody } from '../../../../../common/api/endpoint';
import { useSendShellRequest } from '../../../hooks/response_actions/use_send_shell_request';
import type { ResponseActionExecuteOutputContent } from '../../../../../common/endpoint/types';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';
import { parsedExecuteTimeout } from '../lib/utils';

export const ShellActionResult = memo<ActionRequestComponentProps<{}>>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const actionCreator = useSendShellRequest();

    const actionRequestBody = useMemo<undefined | ExecuteActionRequestBody>(() => {
      const endpointId = command.commandDefinition?.meta?.endpointId;
      const agentType = command.commandDefinition?.meta?.agentType;

      if (!endpointId) {
        return;
      }
      return {
        endpoint_ids: [endpointId],
        agent_type: agentType,
        parameters: {
          command: command.args.args.command[0],
          timeout: parsedExecuteTimeout(command.args.args.timeout?.[0]),
        },
        comment: command.args.args?.comment?.[0],
      };
    }, [
      command.commandDefinition?.meta?.endpointId,
      command.commandDefinition?.meta?.agentType,
      command.args.args.command,
      command.args.args.timeout,
      command.args.args?.comment,
    ]);

    const { result, actionDetails: completedActionDetails } = useConsoleActionSubmitter({
      ResultComponent,
      setStore,
      store,
      status,
      setStatus,
      actionCreator,
      actionRequestBody,
      dataTestSubj: 'init',
      pendingMessage: i18n.translate('xpack.securitySolution.initAction.pendingMessage', {
        defaultMessage: 'Shell command execution is in progress.',
      }),
    });
    const agentId =
      command.commandDefinition?.meta?.endpointId || completedActionDetails?.agents[0];
    const outputContent = useMemo(
      () =>
        completedActionDetails?.outputs &&
        completedActionDetails?.outputs[agentId] &&
        (completedActionDetails?.outputs[agentId].content as ResponseActionExecuteOutputContent),
      [completedActionDetails?.outputs, agentId]
    );

    if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
      return result;
    }

    // Show results
    return (
      <ResultComponent
        data-test-subj="executeSuccess"
        showAs="success"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.shellExecuteAction.successTitle',
          { defaultMessage: 'Shell execution was successful.' }
        )}
      >
        {outputContent && (
          <ExecuteActionHostResponseOutputSimple
            outputContent={outputContent}
            data-test-subj={`init-executeResponseOutput`}
            textSize={'s'}
          />
        )}
      </ResultComponent>
    );
  }
);

ShellActionResult.displayName = 'ShellActionResult';
