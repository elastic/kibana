/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { ExecuteActionRequestBody } from '../../../../../common/endpoint/schema/actions';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ResponseActionExecuteOutputContent } from '../../../../../common/endpoint/types';
import { useSendExecuteEndpoint } from '../../../hooks/response_actions/use_send_execute_endpoint_request';
import type { ActionRequestComponentProps } from '../types';
import { parsedTimeoutInMilliseconds } from '../lib/utils';
import {
  ResponseActionFileDownloadLink,
  type ResponseActionFileDownloadLinkProps,
} from '../../response_action_file_download_link/response_action_file_download_link';

const getOutputForAgent = (
  action: ResponseActionFileDownloadLinkProps['action'],
  agentId?: string,
  outputs?: Record<string, { content: ResponseActionExecuteOutputContent }>
) => {
  if (!(agentId && outputs && outputs[agentId])) {
    return <></>;
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h4>{'stdout:'}</h4>
        </EuiTitle>
        <div>{outputs[agentId].content.stdout}</div>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h4>{'stderr:'}</h4>
        </EuiTitle>
        <div>{outputs[agentId].content.stderr}</div>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h4>{'full output:'}</h4>
        </EuiTitle>
        <ResponseActionFileDownloadLink action={action} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ExecuteActionResult = memo<
  ActionRequestComponentProps<{
    command: string;
    timeout?: string;
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendExecuteEndpoint();

  const actionRequestBody = useMemo<undefined | ExecuteActionRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;

    return endpointId
      ? {
          endpoint_ids: [endpointId],
          parameters: {
            command: command.args.args.command[0],
            timeout: parsedTimeoutInMilliseconds(command.args.args.timeout?.[0]),
          },
          comment: command.args.args?.comment?.[0],
        }
      : undefined;
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
    <ResultComponent data-test-subj="executeSuccess" showTitle={false}>
      {getOutputForAgent(
        completedActionDetails,
        command.commandDefinition?.meta?.endpointId,
        completedActionDetails.outputs
      )}
    </ResultComponent>
  );
});
ExecuteActionResult.displayName = 'ExecuteActionResult';
