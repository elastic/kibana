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
import { FormattedMessage } from '@kbn/i18n-react';
import type { BaseActionRequestBody } from '../../../../../common/endpoint/schema/actions';
import { ActionSuccess } from '../action_success';
import { ActionError } from '../action_error';
import { FormattedError } from '../../formatted_error';
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

/**
 * Command store state for response action api state.
 */
export interface CommandResponseActionApiState {
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
    CommandExecutionComponentProps<any, CommandResponseActionApiState>,
    'ResultComponent' | 'setStore' | 'store' | 'status' | 'setStatus'
  > {
  actionCreator: UseMutationResult<
    ResponseActionApiResponse,
    IHttpFetchError,
    BaseActionRequestBody
  >;
  /**
   * The API request body. If `undefined`, then API will not be called.
   */
  actionRequestBody: unknown | undefined;
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

  const { actionDetails, actionDetailsError } = currentActionState;
  const {
    actionId,
    sent: actionRequestSent,
    error: actionRequestError,
  } = currentActionState.request;

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

  // If an error was returned while attempting to create the action request,
  // then set command status to error
  useEffect(() => {
    if (actionRequestError && isPending) {
      setStatus('error');
    }
  }, [actionRequestError, isPending, setStatus]);

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

  // Calculate the action's UI result based on the different API responses
  const result = useMemo(() => {
    if (isPending) {
      return <ResultComponent showAs="pending" />;
    }

    const apiError = actionRequestError || actionDetailsError;

    if (apiError) {
      return (
        <ResultComponent showAs="failure" data-test-subj="responseActionFailure">
          <FormattedMessage
            id="xpack.securitySolution.endpointResponseActions.killProcess.performApiErrorMessage"
            defaultMessage="The following error was encountered:"
          />
          <FormattedError error={apiError} data-test-subj="responseActionApiErrorDetail" />
        </ResultComponent>
      );
    }

    if (actionDetails) {
      // Response action failures
      if (actionDetails.errors) {
        return (
          <ActionError
            ResultComponent={ResultComponent}
            action={actionDetails}
            dataTestSubj={'responseActionExecError'}
          />
        );
      }

      return (
        <ActionSuccess
          ResultComponent={ResultComponent}
          action={actionDetails}
          data-test-subj="responseActionSuccess"
        />
      );
    }

    return <></>;
  }, [isPending, actionRequestError, actionDetailsError, actionDetails, ResultComponent]);

  return {
    result,
    action: apiActionDetails?.data,
  };
};
