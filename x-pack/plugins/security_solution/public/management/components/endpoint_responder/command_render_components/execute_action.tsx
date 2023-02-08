/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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

const EXECUTE_FILE_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.responseActionExecuteDownloadLink.downloadButtonLabel',
  { defaultMessage: 'Click here to download full output' }
);

const ExecutionActionOutputGist = memo(
  ({
    content,
    id,
    initialIsOpen = false,
    type,
  }: {
    content: string;
    id: string;
    initialIsOpen?: boolean;
    type: 'output' | 'error';
  }) => {
    return (
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={i18n.translate(
          'xpack.securitySolution.responseActionExecuteAccordion.buttonText',
          {
            values: { type },
            defaultMessage: 'Execution {type} (truncated)',
          }
        )}
        paddingSize="s"
      >
        <EuiText size="s">
          <p>{content}</p>
        </EuiText>
      </EuiAccordion>
    );
  }
);
ExecutionActionOutputGist.displayName = 'ExecutionActionOutputGist';

const ExecuteActionOutput = memo(
  ({
    action,
    agentId,
    outputs,
  }: {
    action: ResponseActionFileDownloadLinkProps['action'];
    agentId?: string;
    outputs?: Record<string, { content: ResponseActionExecuteOutputContent }>;
  }) => {
    const prefix = 'executeActionOutputAccordions';
    const executionOutputAccordionStdout = useGeneratedHtmlId({
      prefix,
      suffix: 'stdout',
    });
    const executionOutputAccordionStderr = useGeneratedHtmlId({
      prefix,
      suffix: 'stderr',
    });

    if (!(agentId && outputs && outputs[agentId])) {
      return <></>;
    }

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <ResponseActionFileDownloadLink action={action} buttonTitle={EXECUTE_FILE_LINK_TITLE} />
        </EuiFlexItem>
        <EuiFlexItem>
          <ExecutionActionOutputGist
            content={outputs[agentId].content.stdout}
            id={executionOutputAccordionStdout}
            initialIsOpen
            type="output"
          />
          <EuiSpacer size="m" />
          <ExecutionActionOutputGist
            content={outputs[agentId].content.stderr}
            id={executionOutputAccordionStderr}
            type="error"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ExecuteActionOutput.displayName = 'ExecuteActionOutput';

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
    <ResultComponent
      data-test-subj="executeSuccess"
      showAs="success"
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.executeAction.successTitle',
        { defaultMessage: 'Command execution was successful.' }
      )}
    >
      <ExecuteActionOutput
        action={completedActionDetails}
        agentId={command.commandDefinition?.meta?.endpointId}
        outputs={completedActionDetails.outputs}
      />
    </ResultComponent>
  );
});
ExecuteActionResult.displayName = 'ExecuteActionResult';
