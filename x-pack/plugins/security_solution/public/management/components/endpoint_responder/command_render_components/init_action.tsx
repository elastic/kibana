/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ExecuteActionHostResponseOutputSimple } from '../../endpoint_execute_action/execute_action_host_response_simple';
import type { ResponseActionExecuteOutputContent } from '../../../../../common/endpoint/types';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';
import { useSendInitRequest } from '../../../hooks/response_actions/use_send_init_request';

export const InitActionResult = memo<ActionRequestComponentProps<{}>>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const actionCreator = useSendInitRequest();

    const actionRequestBody = useMemo<undefined | unknown>(() => {
      const endpointId = command.commandDefinition?.meta?.endpointId;
      const { comment } = command.args.args;
      const agentType = command.commandDefinition?.meta?.agentType;

      return endpointId
        ? {
            agent_type: agentType,
            endpoint_ids: [endpointId],
            comment: comment?.[0],
            // endpoint_ids: ['test-agent-id-123456789'],
            // agent_type: 'crowdstrike',
          }
        : undefined;
    }, [
      command.args.args,
      command.commandDefinition?.meta?.agentType,
      command.commandDefinition?.meta?.endpointId,
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
        defaultMessage: 'Initialization is in progress.',
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
          'xpack.securitySolution.endpointResponseActions.executeAction.successTitle',
          { defaultMessage: 'Session initialization was successful.' }
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

InitActionResult.displayName = 'InitActionResult';
