/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { fetchActionDetails } from '../../../services/actions';
import { EndpointError } from '../../../../../common/endpoint/errors';
import { HostInfo } from '../../../../../common/endpoint/types';
import { Command, CommandExecutionResponse } from '../../console/types';
import { isolateHost } from '../../../../common/lib/endpoint_isolation';

export const handleIsolateAction = async (
  endpointHostInfo: HostInfo,
  command: Command
): Promise<CommandExecutionResponse> => {
  let isolateActionId: string;

  // Create isolate action
  try {
    isolateActionId = (
      await isolateHost({
        endpoint_ids: [endpointHostInfo.metadata.agent.id],
        ...(command.args.hasArg('comment') ? { comment: command.args.args?.comment.value } : {}),
      })
    ).action;
  } catch (error) {
    throw new EndpointError(
      i18n.translate('xpack.securitySolution.endpointResponseActions.isolate.actionCreateFailure', {
        defaultMessage: 'Failed to create isolate action. Reason: {message}',
        values: { message: error.message },
      }),
      error
    );
  }

  // Wait for it to receive a response
  // FIXME:PT need to redesign execute Command so that we don't do this.
  const maxAttempts = 1000;
  const sleep = async () => new Promise((r) => setTimeout(r, 5000));
  let attempts = 0;
  let isTimedOut = false;
  let isPending = true;

  while (isPending) {
    attempts++;
    isTimedOut = attempts >= maxAttempts;

    isPending = !(await fetchActionDetails(isolateActionId)).data.isCompleted;

    if (isPending && !isTimedOut) {
      await sleep();
    }
  }

  // Return response
  return {
    result: (
      <EuiCallOut
        color="success"
        iconType="check"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.isolate.successMessageTitle',
          { defaultMessage: 'Success' }
        )}
      >
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.isolate.successMessage"
          defaultMessage="A host isolation request was sent and an acknowledgement was received from Host."
        />
      </EuiCallOut>
    ),
  };
};
