/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import type { ResponseActionGetFileRequestBody } from '../../../../../common/endpoint/schema/actions';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import { useSendExecuteFileRequest } from '../../../hooks/response_actions/use_send_execute_file_request';
import type { ActionRequestComponentProps } from '../types';
import { ACTION_AGENT_FILE_DOWNLOAD_ROUTE } from '../../../../../common/endpoint/constants';

export const ExecuteFileAction = memo<
  ActionRequestComponentProps<{
    file: File;
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendExecuteFileRequest();
  const stdOutId = useGeneratedHtmlId({ prefix: 'stdout' });
  const stdErrId = useGeneratedHtmlId({ prefix: 'stderr' });

  const actionRequestBody = useMemo<undefined | ResponseActionGetFileRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const { file, comment } = command.args.args;

    return endpointId
      ? {
          endpoint_ids: [endpointId],
          comment: comment?.[0],
          file: file[0],
        }
      : undefined;
  }, [command.args.args, command.commandDefinition?.meta?.endpointId]);

  const { result, actionDetails } = useConsoleActionSubmitter<ResponseActionGetFileRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'executeFile',
    pendingMessage: i18n.translate('xpack.securitySolution.getFileAction.pendingMessage', {
      defaultMessage: 'Uploading file and creating action.',
    }),
  });

  if (actionDetails?.isCompleted && actionDetails.wasSuccessful) {
    const fileId = actionDetails.parameters.file.id;
    const downloadUrl = resolvePathVariables(ACTION_AGENT_FILE_DOWNLOAD_ROUTE, {
      action_id: 'kbn_upload',
      agent_id: fileId.substring(fileId.indexOf('.') + 1),
    });

    return (
      <ResultComponent
        showAs="success"
        data-test-subj="getFileSuccess"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getFileAction.successTitle',
          { defaultMessage: 'File execution was successful.' }
        )}
      >
        <EuiSpacer size="m" />

        <EuiAccordion id={stdOutId} buttonContent="Execution output (STDOUT)">
          <EuiSpacer size="s" />
          <EuiPanel hasShadow={false} color="transparent" hasBorder style={{ marginLeft: '2em' }}>
            <pre>{JSON.stringify(actionDetails, null, 2)}</pre>
            <EuiSpacer size="l" />
          </EuiPanel>
        </EuiAccordion>

        <EuiSpacer size="l" />

        <EuiAccordion id={stdErrId} buttonContent="Execution errors (STDERR)">
          <EuiSpacer size="s" />
          <EuiPanel hasShadow={false} color="transparent" hasBorder style={{ marginLeft: '2em' }}>
            <pre>{'errors (if any) would be shown here'}</pre>
            <EuiSpacer size="l" />
          </EuiPanel>
        </EuiAccordion>

        <EuiSpacer size="xl" />

        <EuiButtonEmpty href={downloadUrl} iconType="download" flush="left" iconSize="s" download>
          <EuiText size="s">
            {'Download a zip file containing the full output of the execution'}
          </EuiText>
        </EuiButtonEmpty>
      </ResultComponent>
    );
  }

  return result;
});
ExecuteFileAction.displayName = 'ExecuteFileAction';
