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

const getExternalService = (value: string): CaseFullExternalService | null =>
  parseString(`${value}`);

export const getPushedInfo = (
  caseUserActions: CaseUserActions[],
  caseConnectorId: string
): {
  caseServices: CaseServices;
  hasDataToPush: boolean;
} => {
  const pushActionConnectorIds = caseUserActions.reduce((acc, cua) => {
    if (cua.action !== 'push-to-service') {
      return acc;
    }
    const serviceIsMatching = getExternalService(`${cua.newValue}`);
    if (serviceIsMatching != null && acc.indexOf(serviceIsMatching.connector_id) === -1) {
      return [...acc, serviceIsMatching.connector_id];
    }
    return acc;
  }, [] as string[]);

  const caseServices: CaseServices = pushActionConnectorIds.reduce((acc, cId) => {
    const userActionsForPushLessServiceUpdates = caseUserActions.filter(
      mua =>
        (mua.action !== 'push-to-service' &&
          !(mua.action === 'update' && mua.actionField[0] === 'connector_id')) ||
        (mua.action === 'push-to-service' &&
          cId === getExternalService(`${mua.newValue}`)?.connector_id)
    );

    return {
      ...acc,
      ...caseUserActions.reduce((dacc, cua, i) => {
        if (cua.action !== 'push-to-service') {
          return dacc;
        }
        const possibleExternalService: CaseFullExternalService | null = parseString(
          `${cua.newValue}`
        );
        if (possibleExternalService === null || possibleExternalService.connector_id !== cId) {
          return dacc;
        }
        const typedAcc: CaseServices = dacc;

        return typedAcc[possibleExternalService.connector_id] != null
          ? {
              ...dacc,
              [possibleExternalService.connector_id]: {
                ...typedAcc[possibleExternalService.connector_id],
                ...possibleExternalService,
                lastPushIndex: i,
                hasDataToPush:
                  userActionsForPushLessServiceUpdates[
                    userActionsForPushLessServiceUpdates.length - 1
                  ].action !== 'push-to-service',
              },
            }
          : {
              ...dacc,
              [possibleExternalService.connector_id]: {
                ...possibleExternalService,
                firstPushIndex: i,
                lastPushIndex: i,
                hasDataToPush:
                  userActionsForPushLessServiceUpdates[
                    userActionsForPushLessServiceUpdates.length - 1
                  ].action !== 'push-to-service',
              },
            };
      }, {}),
    };
  }, {} as CaseServices);

  const hasDataToPush =
    caseServices[caseConnectorId] != null ? caseServices[caseConnectorId].hasDataToPush : true;
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
  }, [caseId, caseConnectorId]);
  return { ...caseUserActionsState, fetchCaseUserActions };
};
