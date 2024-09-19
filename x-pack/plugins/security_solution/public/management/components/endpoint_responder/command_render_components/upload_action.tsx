/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type {
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
} from '../../../../../common/endpoint/types';
import { EndpointUploadActionResult } from '../../endpoint_upload_action_result';
import type { UploadActionUIRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import { useSendUploadEndpointRequest } from '../../../hooks/response_actions/use_send_upload_endpoint_request';
import type { ActionRequestComponentProps } from '../types';

export const UploadActionResult = memo<
  ActionRequestComponentProps<
    {
      file: File;
      overwrite?: boolean;
    },
    ResponseActionUploadOutputContent,
    ResponseActionUploadParameters
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  console.log('command: ', command);

  const actionCreator = useSendUploadEndpointRequest();

  const actionRequestBody = useMemo<undefined | UploadActionUIRequestBody>(() => {
    const { agentType, endpointId } = command.commandDefinition?.meta ?? {};
    const { comment, overwrite, file } = command.args.args;

    if (!endpointId) {
      return;
    }

    const reqBody: UploadActionUIRequestBody = {
      agent_type: agentType,
      endpoint_ids: [endpointId],
      ...(comment?.[0] ? { comment: comment?.[0] } : {}),
      parameters:
        overwrite !== undefined
          ? {
              overwrite: overwrite?.[0],
            }
          : {},
      file: file[0],
    };

    return reqBody;
  }, [command.args.args, command.commandDefinition?.meta]);

  const { result, actionDetails } = useConsoleActionSubmitter<
    UploadActionUIRequestBody,
    ResponseActionUploadOutputContent,
    ResponseActionUploadParameters
  >({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'upload',
  });

  if (actionDetails?.isCompleted && actionDetails.wasSuccessful) {
    return (
      <ResultComponent>
        <EndpointUploadActionResult action={actionDetails} />
      </ResultComponent>
    );
  }

  return result;
});
UploadActionResult.displayName = 'UploadActionResult';
