/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { getHostActionFileDownloadUrl } from '../../services/response_actions/get_host_action_file_download_url';
import { useSendGetFileRequest } from '../../hooks/endpoint/use_send_get_file_request';
import type { ResponseActionGetFileRequestBody } from '../../../../common/endpoint/schema/actions';
import { useConsoleActionSubmitter } from './hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from './types';

export const GetFileActionResult = memo<
  ActionRequestComponentProps<{
    path: string[];
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendGetFileRequest();

  const actionRequestBody = useMemo<undefined | ResponseActionGetFileRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const { path, comment } = command.args.args;

    return endpointId
      ? {
          endpoint_ids: [endpointId],
          comment: comment?.[0],
          parameters: {
            path: path[0],
          },
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
    dataTestSubj: 'getFile',
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
        <EuiButtonEmpty
          href={getHostActionFileDownloadUrl(actionDetails)}
          iconType="download"
          data-test-subj="fileDownloadLink"
          flush="both"
          download
        >
          <FormattedMessage
            id="xpack.securitySolution.endpointResponseActions.getFileAction.downloadLink"
            defaultMessage="Click here to download"
          />
        </EuiButtonEmpty>
      </ResultComponent>
    );
  }

  return result;
});
GetFileActionResult.displayName = 'GetFileActionResult';
