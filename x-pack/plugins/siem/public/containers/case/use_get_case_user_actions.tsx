/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import { useCallback, useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../components/toasters';
import { getCaseUserActions } from './api';
import * as i18n from './translations';
import { CaseExternalService, CaseUserActions, ElasticUser } from './types';
import { parseString } from './utils';
import { CaseFullExternalService } from '../../../../case/common/api/cases';

interface CaseService extends CaseExternalService {
  firstPushIndex: number;
  lastPushIndex: number;
  hasDataToPush: boolean;
}

export interface CaseServices {
  [key: string]: CaseService;
}

interface CaseUserActionsState {
  caseServices: CaseServices;
  caseUserActions: CaseUserActions[];
  hasDataToPush: boolean;
  isError: boolean;
  isLoading: boolean;
  participants: ElasticUser[];
}

export const initialData: CaseUserActionsState = {
  caseServices: {},
  caseUserActions: [],
  hasDataToPush: false,
  isError: false,
  isLoading: true,
  participants: [],
};

export interface UseGetCaseUserActions extends CaseUserActionsState {
  fetchCaseUserActions: (caseId: string) => void;
}

const getPushedInfo = (
  caseUserActions: CaseUserActions[],
  caseConnectorId: string
): {
  caseServices: CaseServices;
  hasDataToPush: boolean;
} => {
  const caseServices: CaseServices = caseUserActions.reduce((acc, cua, i) => {
    if (cua.action !== 'push-to-service') {
      return acc;
    }
    const possibleExternalService: CaseFullExternalService | null = parseString(`${cua.newValue}`);
    if (possibleExternalService === null) {
      return acc;
    }
    const typedAcc: CaseServices = acc;
    return typedAcc[possibleExternalService.connector_id] != null
      ? {
          ...acc,
          [possibleExternalService.connector_id]: {
            ...typedAcc[possibleExternalService.connector_id],
            ...possibleExternalService,
            lastPushIndex: i,
            hasDataToPush: i < caseUserActions.length - 1,
          },
        }
      : {
          ...acc,
          [possibleExternalService.connector_id]: {
            ...possibleExternalService,
            firstPushIndex: i,
            lastPushIndex: i,
            hasDataToPush: i < caseUserActions.length - 1,
          },
        };
  }, {});
  const hasDataToPush = caseServices[caseConnectorId].hasDataToPush;
  return {
    hasDataToPush,
    caseServices,
  };
};

export const useGetCaseUserActions = (
  caseId: string,
  caseConnectorId: string
): UseGetCaseUserActions => {
  const [caseUserActionsState, setCaseUserActionsState] = useState<CaseUserActionsState>(
    initialData
  );

  const [, dispatchToaster] = useStateToaster();

  const fetchCaseUserActions = useCallback(
    (thisCaseId: string) => {
      let didCancel = false;
      const abortCtrl = new AbortController();
      const fetchData = async () => {
        setCaseUserActionsState({
          ...caseUserActionsState,
          isLoading: true,
        });
        try {
          const response = await getCaseUserActions(thisCaseId, abortCtrl.signal);
          if (!didCancel) {
            // Attention Future developer
            // We are removing the first item because it will always be the creation of the case
            // and we do not want it to simplify our life
            const participants = !isEmpty(response)
              ? uniqBy('actionBy.username', response).map(cau => cau.actionBy)
              : [];

            const caseUserActions = !isEmpty(response) ? response.slice(1) : [];
            setCaseUserActionsState({
              caseUserActions,
              ...getPushedInfo(caseUserActions, caseConnectorId),
              isLoading: false,
              isError: false,
              participants,
            });
          }
        } catch (error) {
          if (!didCancel) {
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
            setCaseUserActionsState({
              caseServices: {},
              caseUserActions: [],
              hasDataToPush: false,
              isError: true,
              isLoading: false,
              participants: [],
            });
          }
        }
      };
      fetchData();
      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    [caseUserActionsState, caseConnectorId]
  );

  useEffect(() => {
    if (!isEmpty(caseId)) {
      fetchCaseUserActions(caseId);
    }
  }, [caseId]);
  return { ...caseUserActionsState, fetchCaseUserActions };
};
