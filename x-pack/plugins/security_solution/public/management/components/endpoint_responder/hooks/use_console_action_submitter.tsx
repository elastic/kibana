/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useGetActionDetails } from '../../../hooks/endpoint/use_get_action_details';
import { ACTION_DETAILS_REFRESH_INTERVAL } from '../constants';
import { useIsMounted } from '../../../hooks/use_is_mounted';
import type {
  ActionDetails,
  Immutable,
  ResponseActionApiResponse,
} from '../../../../../common/endpoint/types';
import type { CommandExecutionComponentProps } from '../../console';

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

  const currentActionState = useMemo<
    Immutable<Required<CommandResponseActionApiState>['actionApiState']>
  >(
    () =>
      store.actionApiState ?? {
        request: {
          sent: false,
          error: undefined,
          actionId: undefined,
        },
        actionDetails: undefined,
        actionDetailsError: undefined,
      },
    [store.actionApiState]
  );

  const { actionId, sent: actionRequestSent } = currentActionState.request;

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
          sent: true,
        };

      actionCreator
        .mutateAsync(actionRequestBody)
        .then((response) => {
          updatedRequestState.actionId = response.data.id;
        })
        .catch((err) => {
          updatedRequestState.error = err;
        })
        .finally(() => {
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

  // If an error was return by the Action Details API, then store it and set the status to error
  useEffect(() => {
    if (apiActionDetailsError && isPending) {
      setStatus('error');
      setStore((prevState) => {
        return {
          ...prevState,
          actionApiState: {
            ...(prevState.actionApiState ?? currentActionState),
            actionDetails: undefined,
            actionDetailsError: apiActionDetailsError,
          },
        };
      });
    }
  }, [apiActionDetailsError, currentActionState, isPending, setStatus, setStore]);

  // If the action details indicates complete, then update the action's console state and set the status to success
  useEffect(() => {
    if (apiActionDetails?.data.isCompleted && isPending) {
      setStatus('success');
      setStore((prevState) => {
        return {
          ...prevState,
          actionApiState: {
            ...(prevState.actionApiState ?? currentActionState),
            actionDetails: apiActionDetails.data,
          },
        };
      });
    }
  }, [apiActionDetails, currentActionState, isPending, setStatus, setStore]);

  return {
    result: <>{'something here'}</>,
    action: undefined,
  };
};
