/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { EndpointCommandDefinition } from './types';
import { useSendIsolateEndpointRequest } from '../../hooks/endpoint/use_send_isolate_endpoint_request';
import { CommandExecutionComponentProps } from '../console/types';

export const IsolateActionResult = memo<CommandExecutionComponentProps<EndpointCommandDefinition>>(
  ({ command, setStore, store, status, setStatus }) => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const actionId = store.actionId;

    const actionRequestSent = Boolean(store.actionRequestSent);
    const isolateHost = useSendIsolateEndpointRequest();

    useEffect(() => {
      if (!actionRequestSent && endpointId) {
        isolateHost.mutate({
          endpoint_ids: [endpointId],
          comment: command.args.args?.comment?.value,
        });

        setStore((prevState) => {
          return { ...prevState, actionRequestSent: true };
        });
      }
    }, [actionRequestSent, command.args.args?.comment?.value, endpointId, isolateHost, setStore]);

    useEffect(() => {
      if (isolateHost.isSuccess && actionId !== isolateHost.data.action) {
        setStore((prevState) => {
          return { ...prevState, actionId: isolateHost.data.action };
        });
      }
    }, [actionId, isolateHost?.data?.action, isolateHost.isSuccess, setStore]);

    useEffect(() => {
      if (actionId) {
        // FIXME:PT Start waiting for an action response
      }
    }, [actionId]);

    // Show nothing if still pending
    if (status === 'pending') {
      return null;
    }

    // If the action failed, then show error
    // TODO: implement failure in action request or response

    // Show Success
    return (
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
    );
  }
);
IsolateActionResult.displayName = 'IsolateActionResult';

//
//
//
//
//
//
//
//
//
//
//
//
// export const handleIsolateAction = async (
//   endpointMetadata: HostMetadata,
//   command: Command
// ): Promise<CommandExecutionResponse> => {
//   let isolateActionId: string;
//
//   // Create isolate action
//   try {
//     isolateActionId = (
//       await isolateHost({
//         endpoint_ids: [endpointMetadata.agent.id],
//         ...(command.args.hasArg('comment') ? { comment: command.args.args?.comment.value } : {}),
//       })
//     ).action;
//   } catch (error) {
//     throw new EndpointError(
//       i18n.translate('xpack.securitySolution.endpointResponseActions.isolate.actionCreateFailure', {
//         defaultMessage: 'Failed to create isolate action. Reason: {message}',
//         values: { message: error.message },
//       }),
//       error
//     );
//   }
//
//   // Wait for it to receive a response
//   // FIXME:PT need to redesign execute Command so that we don't do this.
//   const maxAttempts = 1000;
//   const sleep = async () => new Promise((r) => setTimeout(r, 5000));
//   let attempts = 0;
//   let isTimedOut = false;
//   let isPending = true;
//
//   while (isPending) {
//     attempts++;
//     isTimedOut = attempts >= maxAttempts;
//
//     isPending = !(await fetchActionDetails(isolateActionId)).data.isCompleted;
//
//     if (isPending && !isTimedOut) {
//       await sleep();
//     }
//   }
//
//   // Return response
//   return {
//     result: (
//       <EuiCallOut
//         color="success"
//         iconType="check"
//         title={i18n.translate(
//           'xpack.securitySolution.endpointResponseActions.isolate.successMessageTitle',
//           { defaultMessage: 'Success' }
//         )}
//       >
//         <FormattedMessage
//           id="xpack.securitySolution.endpointResponseActions.isolate.successMessage"
//           defaultMessage="A host isolation request was sent and an acknowledgement was received from Host."
//         />
//       </EuiCallOut>
//     ),
//   };
// };
