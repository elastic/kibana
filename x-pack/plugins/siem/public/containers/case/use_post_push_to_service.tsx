/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import {
  ServiceConnectorCaseResponse,
  ServiceConnectorCaseParams,
} from '../../../../case/common/api';
import { errorToToaster, useStateToaster, displaySuccessToast } from '../../components/toasters';

import { getCase, pushToService, pushCase } from './api';
import * as i18n from './translations';
import { Case } from './types';

interface PushToServiceState {
  serviceData: ServiceConnectorCaseResponse | null;
  pushedCaseData: Case | null;
  isLoading: boolean;
  isError: boolean;
}
type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS_PUSH_SERVICE'; payload: ServiceConnectorCaseResponse | null }
  | { type: 'FETCH_SUCCESS_PUSH_CASE'; payload: Case | null }
  | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: PushToServiceState, action: Action): PushToServiceState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case 'FETCH_SUCCESS_PUSH_SERVICE':
      return {
        ...state,
        isLoading: false,
        isError: false,
        serviceData: action.payload ?? null,
      };
    case 'FETCH_SUCCESS_PUSH_CASE':
      return {
        ...state,
        isLoading: false,
        isError: false,
        pushedCaseData: action.payload ?? null,
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
  connectorId: string;
  connectorName: string;
  updateCase: (newCase: Case) => void;
}

export interface UsePostPushToService extends PushToServiceState {
  postPushToService: ({ caseId, connectorId, updateCase }: PushToServiceRequest) => void;
}

export const usePostPushToService = (): UsePostPushToService => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    serviceData: null,
    pushedCaseData: null,
    isLoading: false,
    isError: false,
  });
  const [, dispatchToaster] = useStateToaster();

  const postPushToService = useCallback(
    async ({ caseId, connectorId, connectorName, updateCase }: PushToServiceRequest) => {
      let cancel = false;
      const abortCtrl = new AbortController();
      try {
        dispatch({ type: 'FETCH_INIT' });
        const casePushData = await getCase(caseId, true, abortCtrl.signal);
        const responseService = await pushToService(
          connectorId,
          formatServiceRequestData(casePushData),
          abortCtrl.signal
        );
        const responseCase = await pushCase(
          caseId,
          {
            connector_id: connectorId,
            connector_name: connectorName,
            external_id: responseService.id,
            external_title: responseService.title,
            external_url: responseService.url,
          },
          abortCtrl.signal
        );
        if (!cancel) {
          dispatch({ type: 'FETCH_SUCCESS_PUSH_SERVICE', payload: responseService });
          dispatch({ type: 'FETCH_SUCCESS_PUSH_CASE', payload: responseCase });
          updateCase(responseCase);
          displaySuccessToast(i18n.SUCCESS_SEND_TO_EXTERNAL_SERVICE, dispatchToaster);
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
      return () => {
        cancel = true;
        abortCtrl.abort();
      };
    },
    []
  );

  return { ...state, postPushToService };
};

export const formatServiceRequestData = (myCase: Case): ServiceConnectorCaseParams => {
  const {
    id: caseId,
    createdAt,
    createdBy,
    comments,
    description,
    externalService,
    title,
    updatedAt,
    updatedBy,
  } = myCase;
  return {
    caseId,
    createdAt,
    createdBy: {
      fullName: createdBy.fullName ?? null,
      username: createdBy?.username ?? '',
    },
    comments: comments
      .filter(c => {
        const lastPush = c.pushedAt != null ? new Date(c.pushedAt) : null;
        const lastUpdate = c.updatedAt != null ? new Date(c.updatedAt) : null;
        if (
          lastPush === null ||
          (lastPush != null && lastUpdate != null && lastPush.getTime() < lastUpdate?.getTime())
        ) {
          return true;
        }
        return false;
      })
      .map(c => ({
        commentId: c.id,
        comment: c.comment,
        createdAt: c.createdAt,
        createdBy: {
          fullName: c.createdBy.fullName ?? null,
          username: c.createdBy.username ?? '',
        },
        updatedAt: c.updatedAt,
        updatedBy:
          c.updatedBy != null
            ? {
                fullName: c.updatedBy.fullName ?? null,
                username: c.updatedBy.username ?? '',
              }
            : null,
      })),
    description,
    externalId: externalService?.externalId ?? null,
    title,
    updatedAt,
    updatedBy:
      updatedBy != null
        ? {
            fullName: updatedBy.fullName ?? null,
            username: updatedBy.username ?? '',
          }
        : null,
  };
};
