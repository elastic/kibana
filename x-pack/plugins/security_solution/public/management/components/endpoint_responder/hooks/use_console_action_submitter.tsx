/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useGetActionDetails } from '../../../hooks/endpoint/use_get_action_details';
import { ACTION_DETAILS_REFRESH_INTERVAL } from '../constants';
import { useIsMounted } from '../../../hooks/use_is_mounted';
import type {
  ActionDetails,
  Immutable,
  MaybeImmutable,
  ResponseActionApiResponse,
} from '../../../../../common/endpoint/types';
import type { CommandExecutionComponentProps } from '../../console';

const getApiActionState = (
  store: MaybeImmutable<CommandResponseActionApiState>
): Immutable<Required<CommandResponseActionApiState>['actionApiState']> => {
  return (
    store.actionApiState ?? {
      actionRequestSent: false,
      actionRequestError: undefined,
      actionId: undefined,
      actionDetails: undefined,
      actionDetailsError: undefined,
    }
  );
};

interface ConsoleActionSubmitter {
  /**
   * The ui to be returned to the console. This UI will display different states of the action,
   * including pending, error conditions and generic success messages.
   */
  result: JSX.Element;
  action: ActionDetails | undefined;
}

interface CommandResponseActionApiState {
  actionApiState?: {
    request: {
      sent: boolean;
      actionId: string | undefined;
      error: IHttpFetchError | undefined;
    };
    actionDetails: ActionDetails | undefined;
    actionDetailsError: IHttpFetchError | undefined;
  };
}

interface UseConsoleActionSubmitterOptions
  extends Pick<
    CommandExecutionComponentProps<any, CommandResponseActionApiState, any>,
    'ResultComponent' | 'setStore' | 'store' | 'status' | 'setStatus'
  > {
  actionCreator: UseMutationResult<ResponseActionApiResponse, IHttpFetchError, unknown>;
  actionRequestBody: unknown;
}

export const useConsoleActionSubmitter = ({
  actionCreator,
  actionRequestBody,
  setStatus,
  status,
  setStore,
  store,
  ResultComponent,
}: UseConsoleActionSubmitterOptions): ConsoleActionSubmitter => {
  const isMounted = useIsMounted();
  const isPending = status === 'pending';

  // const {
  //   mutate: apiCreateActionRequest,
  //   data: apiActionRequestResponse,
  //   isSuccess: apiIsActionRequestSuccess,
  //   error: apiActionRequestError,
  // } = actionCreator;

  const currentActionState = getApiActionState(store);
  const { actionId, actionRequestSent } = currentActionState.request;

  const { data: apiActionDetails, error: apiActionDetailsError } = useGetActionDetails(
    actionId ?? '-',
    {
      enabled: Boolean(actionId) && isPending,
      refetchInterval: isPending ? ACTION_DETAILS_REFRESH_INTERVAL : false,
    }
  );

  // Create the action request if not yet done
  useEffect(() => {
    if (!actionRequestSent && actionRequestBody && isMounted) {
      const updatedRequestState: Required<CommandResponseActionApiState>['actionApiState']['request'] =
        {
          ...(currentActionState as Required<CommandResponseActionApiState>['actionApiState'])
            .request,
        };

      actionCreator.mutateAsync(actionRequestBody).then((response) => {
        // We mutate the request state here just in case the component is no longer mounted.
        // This ensures that the next time the console is opened, that the actionId is not lost.
        updatedRequestState.actionId = response.data.id;

        // If the component is mounted, then set the store with the updated data (causes a rerender)
        if (isMounted) {
          setStore((prevState) => {
            return {
              ...prevState,
              actionApiState: {
                ...(prevState.actionApiState ?? currentActionState),
                request: { ...updatedRequestState },
              },
            };
          });
        }
      });

      setStore((prevState) => {
        return {
          ...prevState,
          actionApiState: {
            ...(prevState.actionApiState ?? currentActionState),
            request: updatedRequestState,
          },
        };
      });
    }
  }, [
    actionCreator,
    actionRequestBody,
    actionRequestSent,
    currentActionState,
    isMounted,
    setStore,
  ]);

  return {
    result: <>{'something here'}</>,
    action: undefined,
  };
};
