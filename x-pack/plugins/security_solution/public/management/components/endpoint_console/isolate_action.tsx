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
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import { EndpointCommandDefinitionMeta } from './types';
import { useSendIsolateEndpointRequest } from '../../hooks/endpoint/use_send_isolate_endpoint_request';
import { CommandExecutionComponentProps } from '../console/types';

export const IsolateActionResult = memo<
  CommandExecutionComponentProps<
    { actionId?: string; actionRequestSent?: boolean },
    EndpointCommandDefinitionMeta
  >
>(({ command, setStore, store, status, setStatus }) => {
  const endpointId = command.commandDefinition?.meta?.endpointId;
  const actionId = store.actionId;
  const isPending = status === 'pending';
  const actionRequestSent = Boolean(store.actionRequestSent);

  const isolateHost = useSendIsolateEndpointRequest();

  const { data } = useGetActionDetails(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? 3000 : false,
  });

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
    if (data?.data.isCompleted) {
      setStatus('success');
    }
  }, [data?.data.isCompleted, setStatus]);

  // Show nothing if still pending
  if (isPending) {
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
});
IsolateActionResult.displayName = 'IsolateActionResult';
