/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
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
  const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
    'responseActionsSentinelOneV1Enabled'
  );
  const actionCreator = useSendUploadEndpointRequest();

  const actionRequestBody = useMemo<undefined | UploadActionUIRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const { comment, overwrite, file } = command.args.args;
    const agentType = command.commandDefinition?.meta?.agentType as ResponseActionAgentType;

    if (!endpointId) {
      return;
    }

    const reqBody: UploadActionUIRequestBody = {
      agent_type: isSentinelOneV1Enabled ? agentType : undefined,
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
  }, [
    command.args.args,
    command.commandDefinition?.meta?.agentType,
    command.commandDefinition?.meta?.endpointId,
    isSentinelOneV1Enabled,
  ]);

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
