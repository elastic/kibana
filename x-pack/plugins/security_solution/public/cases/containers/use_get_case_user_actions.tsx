/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import { useCallback, useEffect, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { CaseFullExternalService } from '../../../../case/common/api/cases';
import { getCaseUserActions } from './api';
import * as i18n from './translations';
import { CaseConnector, CaseExternalService, CaseUserActions, ElasticUser } from './types';
import { convertToCamelCase, parseString } from './utils';

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

const groupConnectorFields = (
  userActions: CaseUserActions[]
): Record<string, Array<CaseConnector['fields']>> =>
  userActions.reduce((acc, mua) => {
    if (mua.actionField[0] !== 'connector') {
      return acc;
    }

    const oldValue = parseString(`${mua.oldValue}`);
    const newValue = parseString(`${mua.newValue}`);

    if (oldValue == null || newValue == null) {
      return acc;
    }

    return {
      ...acc,
      [oldValue.id]: [
        ...(acc[oldValue.id] || []),
        ...(oldValue.id === newValue.id ? [oldValue.fields, newValue.fields] : [oldValue.fields]),
      ],
      [newValue.id]: [
        ...(acc[newValue.id] || []),
        ...(oldValue.id === newValue.id ? [oldValue.fields, newValue.fields] : [newValue.fields]),
      ],
    };
  }, {} as Record<string, Array<CaseConnector['fields']>>);

const connectorHasChangedFields = ({
  connectorFieldsBeforePush,
  connectorFieldsAfterPush,
  connectorId,
}: {
  connectorFieldsBeforePush: Record<string, Array<CaseConnector['fields']>> | null;
  connectorFieldsAfterPush: Record<string, Array<CaseConnector['fields']>> | null;
  connectorId: string;
}): boolean => {
  if (connectorFieldsAfterPush == null || connectorFieldsAfterPush[connectorId] == null) {
    return false;
  }

  const fieldsAfterPush = connectorFieldsAfterPush[connectorId];

  if (connectorFieldsBeforePush != null && connectorFieldsBeforePush[connectorId] != null) {
    const fieldsBeforePush = connectorFieldsBeforePush[connectorId];
    return !deepEqual(
      fieldsBeforePush[fieldsBeforePush.length - 1],
      fieldsAfterPush[fieldsAfterPush.length - 1]
    );
  }

  if (fieldsAfterPush.length >= 2) {
    return !deepEqual(
      fieldsAfterPush[fieldsAfterPush.length - 2],
      fieldsAfterPush[fieldsAfterPush.length - 1]
    );
  }

  return false;
};

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
  const hasDataToPushForConnector = (connectorId: string): boolean => {
    const caseUserActionsReversed = [...caseUserActions].reverse();
    const lastPushOfConnectorReversedIndex = caseUserActionsReversed.findIndex(
      (mua) =>
        mua.action === 'push-to-service' &&
        getExternalService(`${mua.newValue}`)?.connectorId === connectorId
    );

    if (lastPushOfConnectorReversedIndex === -1) {
      return true;
    }

    const lastPushOfConnectorIndex =
      caseUserActionsReversed.length - lastPushOfConnectorReversedIndex - 1;

    const actionsBeforePush = caseUserActions.slice(0, lastPushOfConnectorIndex);
    const actionsAfterPush = caseUserActions.slice(
      lastPushOfConnectorIndex + 1,
      caseUserActionsReversed.length
    );

    const connectorFieldsBeforePush = groupConnectorFields(actionsBeforePush);
    const connectorFieldsAfterPush = groupConnectorFields(actionsAfterPush);

    const connectorHasChanged = connectorHasChangedFields({
      connectorFieldsBeforePush,
      connectorFieldsAfterPush,
      connectorId,
    });

    return (
      actionsAfterPush.some(
        (mua) => mua.actionField[0] !== 'connector' && mua.action !== 'push-to-service'
      ) || connectorHasChanged
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
