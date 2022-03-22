/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import { useCallback, useEffect, useState, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

import { ElasticUser, CaseUserActions, CaseExternalService } from '../../common/ui/types';
import { ActionTypes, CaseConnector, NONE_CONNECTOR_ID } from '../../common/api';
import { getCaseUserActions } from './api';
import * as i18n from './translations';
import { useToasts } from '../common/lib/kibana';
import {
  isPushedUserAction,
  isConnectorUserAction,
  isCreateCaseUserAction,
} from '../../common/utils/user_actions';

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
  fetchCaseUserActions: (caseId: string, caseConnectorId: string) => Promise<void>;
}

const groupConnectorFields = (
  userActions: CaseUserActions[]
): Record<string, Array<CaseConnector['fields']>> =>
  userActions.reduce((acc, mua) => {
    if (
      (isConnectorUserAction(mua) || isCreateCaseUserAction(mua)) &&
      mua.payload?.connector?.id !== NONE_CONNECTOR_ID
    ) {
      const connector = mua.payload.connector;

      return {
        ...acc,
        [connector.id]: [...(acc[connector.id] || []), connector.fields],
      };
    }

    return acc;
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
        isPushedUserAction<'camelCase'>(mua) &&
        mua.payload.externalService.connectorId === connectorId
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
        (mua) => mua.type !== ActionTypes.connector && mua.type !== ActionTypes.pushed
      ) || connectorHasChanged
    );
  };

  const commentsAndIndex = caseUserActions.reduce<CommentsAndIndex[]>(
    (bacc, mua, index) =>
      mua.type === ActionTypes.comment && mua.commentId != null
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
    if (!isPushedUserAction<'camelCase'>(cua)) {
      return acc;
    }

    const externalService = cua.payload.externalService;
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
  const [caseUserActionsState, setCaseUserActionsState] =
    useState<CaseUserActionsState>(initialData);
  const abortCtrlRef = useRef(new AbortController());
  const isCancelledRef = useRef(false);
  const toasts = useToasts();

  const fetchCaseUserActions = useCallback(
    async (thisCaseId: string, thisCaseConnectorId: string) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        setCaseUserActionsState({
          ...caseUserActionsState,
          isLoading: true,
        });

        const response = await getCaseUserActions(thisCaseId, abortCtrlRef.current.signal);

        if (!isCancelledRef.current) {
          const participants = !isEmpty(response)
            ? uniqBy('createdBy.username', response).map((cau) => cau.createdBy)
            : [];

          const caseUserActions = !isEmpty(response) ? response : [];

          setCaseUserActionsState({
            caseUserActions,
            ...getPushedInfo(caseUserActions, thisCaseConnectorId),
            isLoading: false,
            isError: false,
            participants,
          });
        }
      } catch (error) {
        if (!isCancelledRef.current) {
          if (error.name !== 'AbortError') {
            toasts.addError(
              error.body && error.body.message ? new Error(error.body.message) : error,
              { title: i18n.ERROR_TITLE }
            );
          }

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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseUserActionsState]
  );

  useEffect(() => {
    if (!isEmpty(caseId)) {
      fetchCaseUserActions(caseId, caseConnectorId);
    }

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);
  return { ...caseUserActionsState, fetchCaseUserActions };
};
