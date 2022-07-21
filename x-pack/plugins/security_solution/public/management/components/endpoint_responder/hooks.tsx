/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useIsMounted } from '../../hooks/use_is_mounted';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import { ACTION_DETAILS_REFRESH_INTERVAL } from './constants';
import type { ActionRequestState, ActionRequestComponentProps } from './types';
import type { useSendIsolateEndpointRequest } from '../../hooks/endpoint/use_send_isolate_endpoint_request';
import type { useSendReleaseEndpointRequest } from '../../hooks/endpoint/use_send_release_endpoint_request';

export const useUpdateActionState = ({
  actionRequestApi,
  actionRequest,
  command,
  endpointId,
  setStatus,
  setStore,
  isPending,
}: Pick<ActionRequestComponentProps, 'command' | 'setStatus' | 'setStore'> & {
  actionRequestApi: ReturnType<
    typeof useSendIsolateEndpointRequest | typeof useSendReleaseEndpointRequest
  >;
  actionRequest?: ActionRequestState;
  endpointId?: string;
  isPending: boolean;
}) => {
  const isMounted = useIsMounted();
  const actionRequestSent = Boolean(actionRequest?.requestSent);
  const { data: actionDetails } = useGetActionDetails(actionRequest?.actionId ?? '-', {
    enabled: Boolean(actionRequest?.actionId) && isPending,
    refetchInterval: isPending ? ACTION_DETAILS_REFRESH_INTERVAL : false,
  });

  // Create action request
  useEffect(() => {
    if (!actionRequestSent && endpointId) {
      const request: ActionRequestState = {
        requestSent: true,
        actionId: undefined,
      };

      actionRequestApi
        .mutateAsync({
          endpoint_ids: [endpointId],
          comment: command.args.args?.comment?.[0],
        })
        .then((response) => {
          request.actionId = response.data.id;

          if (isMounted) {
            setStore((prevState) => {
              return { ...prevState, actionRequest: request };
            });
          }
        })
        .finally(() => {
          setStore((prevState) => {
            return { ...prevState, actionRequest: request };
          });
        });

      setStore((prevState) => {
        return { ...prevState, actionRequest: request };
      });
    }
  }, [
    actionRequestApi,
    actionRequestSent,
    command.args.args?.comment,
    endpointId,
    isMounted,
    setStore,
  ]);

  useEffect(() => {
    if (actionDetails?.data.isCompleted) {
      setStatus('success');
      setStore((prevState) => {
        return {
          ...prevState,
          completedActionDetails: actionDetails.data,
        };
      });
    }
  }, [actionDetails?.data, actionDetails?.data.isCompleted, setStatus, setStore]);
};
