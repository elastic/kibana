/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { CaseConnector } from '../../../../cases/common/api';
import {
  errorToToaster,
  useStateToaster,
  displaySuccessToast,
} from '../../common/components/toasters';

import { pushCase } from './api';
import * as i18n from './translations';
import { Case } from './types';

interface PushToServiceState {
  isLoading: boolean;
  isError: boolean;
}
type Action = { type: 'FETCH_INIT' } | { type: 'FETCH_SUCCESS' } | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: PushToServiceState, action: Action): PushToServiceState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      return state;
  }
};

interface PushToServiceRequest {
  caseId: string;
  connector: CaseConnector;
}

export interface UsePostPushToService extends PushToServiceState {
  pushCaseToExternalService: ({
    caseId,
    connector,
  }: PushToServiceRequest) => Promise<Case | undefined>;
}

export const usePostPushToService = (): UsePostPushToService => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
  });
  const [, dispatchToaster] = useStateToaster();
  const cancel = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const pushCaseToExternalService = useCallback(
    async ({ caseId, connector }: PushToServiceRequest) => {
      try {
        abortCtrlRef.current.abort();
        cancel.current = false;
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT' });

        const response = await pushCase(caseId, connector.id, abortCtrlRef.current.signal);

        if (!cancel.current) {
          dispatch({ type: 'FETCH_SUCCESS' });
          displaySuccessToast(
            i18n.SUCCESS_SEND_TO_EXTERNAL_SERVICE(connector.name),
            dispatchToaster
          );
        }

        return response;
      } catch (error) {
        if (!cancel.current) {
          if (error.name !== 'AbortError') {
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
          }
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    return () => {
      abortCtrlRef.current.abort();
      cancel.current = true;
    };
  }, []);

  return { ...state, pushCaseToExternalService };
};
