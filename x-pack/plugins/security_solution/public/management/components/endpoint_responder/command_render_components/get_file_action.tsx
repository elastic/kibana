/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useSendGetFileRequest } from '../../../hooks/response_actions/use_send_get_file_request';
import type { ResponseActionGetFileRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';
import { ResponseActionFileDownloadLink } from '../../response_action_file_download_link';

export const GetFileActionResult = memo<
  ActionRequestComponentProps<{
    path: string[];
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const { canWriteFileOperations } = useUserPrivileges().endpointPrivileges;
  const actionCreator = useSendGetFileRequest();

  const actionRequestBody = useMemo<undefined | ResponseActionGetFileRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const { path, comment } = command.args.args;
    const agentType = command.commandDefinition?.meta?.agentType;

    return endpointId
      ? {
          agent_type: agentType,
          endpoint_ids: [endpointId],
          comment: comment?.[0],
          parameters: {
            path: path[0],
          },
        }
      : undefined;
  }, [
    command.args.args,
    command.commandDefinition?.meta?.agentType,
    command.commandDefinition?.meta?.endpointId,
  ]);

  const { result, actionDetails } = useConsoleActionSubmitter<ResponseActionGetFileRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'getFile',
    pendingMessage: i18n.translate('xpack.securitySolution.getFileAction.pendingMessage', {
      defaultMessage: 'Retrieving the file from host.',
    }),
  });

  if (actionDetails?.isCompleted && actionDetails.wasSuccessful) {
    return (
      <ResultComponent
        showAs="success"
        data-test-subj="getFileSuccess"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getFileAction.successTitle',
          { defaultMessage: 'File retrieved from the host.' }
        )}
      >
        <ResponseActionFileDownloadLink
          action={actionDetails}
          canAccessFileDownloadLink={canWriteFileOperations}
        />
      </ResultComponent>
    );
  }

  return result;
});
GetFileActionResult.displayName = 'GetFileActionResult';
