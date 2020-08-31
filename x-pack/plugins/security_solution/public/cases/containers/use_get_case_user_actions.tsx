/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import { useCallback, useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { getCaseUserActions } from './api';
import * as i18n from './translations';
import { CaseExternalService, CaseUserActions, ElasticUser } from './types';
import { convertToCamelCase, parseString } from './utils';
import { CaseFullExternalService } from '../../../../case/common/api/cases';

export interface CaseService extends CaseExternalService {
  firstPushIndex: number;
  lastPushIndex: number;
  commentsToUpdate: string[];
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

const getExternalService = (value: string): CaseExternalService | null =>
  convertToCamelCase<CaseFullExternalService, CaseExternalService>(parseString(`${value}`));
interface CommentsAndIndex {
  commentId: string;
  commentIndex: number;
}

export const getPushedInfo = (
  caseUserActions: CaseUserActions[],
  caseConnectorId: string
): {
  caseServices: CaseServices;
  hasDataToPush: boolean;
} => {
  const hasDataToPushForConnector = (connectorId: string) => {
    const userActionsForPushLessServiceUpdates = caseUserActions.filter(
      (mua) =>
        (mua.action !== 'push-to-service' &&
          !(mua.action === 'update' && mua.actionField[0] === 'connector_id')) ||
        (mua.action === 'push-to-service' &&
          connectorId === getExternalService(`${mua.newValue}`)?.connectorId)
    );
    return (
      userActionsForPushLessServiceUpdates[userActionsForPushLessServiceUpdates.length - 1]
        .action !== 'push-to-service'
    );
  };
  const commentsAndIndex = caseUserActions.reduce<CommentsAndIndex[]>(
    (bacc, mua, index) =>
      mua.actionField[0] === 'comment' && mua.commentId != null
        ? [
            ...bacc,
            {
              commentId: mua.commentId,
              commentIndex: index,
            },
          ]
        : bacc,
    []
  );

  let caseServices = caseUserActions.reduce<CaseServices>((acc, cua, i) => {
    if (cua.action !== 'push-to-service') {
      return acc;
    }

    const externalService = getExternalService(`${cua.newValue}`);
    if (externalService === null) {
      return acc;
    }

    return {
      ...acc,
      ...(acc[externalService.connectorId] != null
        ? {
            [externalService.connectorId]: {
              ...acc[externalService.connectorId],
              ...externalService,
              lastPushIndex: i,
              commentsToUpdate: [],
            },
          }
        : {
            [externalService.connectorId]: {
              ...externalService,
              firstPushIndex: i,
              lastPushIndex: i,
              hasDataToPush: hasDataToPushForConnector(externalService.connectorId),
              commentsToUpdate: [],
            },
          }),
    };
  }, {});

  caseServices = Object.keys(caseServices).reduce<CaseServices>((acc, key) => {
    return {
      ...acc,
      [key]: {
        ...caseServices[key],
        // if the comment happens after the lastUpdateToCaseIndex, it should be included in commentsToUpdate
        commentsToUpdate: commentsAndIndex.reduce<string[]>(
          (bacc, currentComment) =>
            currentComment.commentIndex > caseServices[key].lastPushIndex
              ? bacc.indexOf(currentComment.commentId) > -1
                ? [...bacc.filter((e) => e !== currentComment.commentId), currentComment.commentId]
                : [...bacc, currentComment.commentId]
              : bacc,
          []
        ),
      },
    };
  }, {});

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
              ? uniqBy('actionBy.username', response).map((cau) => cau.actionBy)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseUserActionsState, caseConnectorId]
  );

  useEffect(() => {
    if (!isEmpty(caseId)) {
      fetchCaseUserActions(caseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, caseConnectorId]);
  return { ...caseUserActionsState, fetchCaseUserActions };
};
