/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import deepEqual from 'fast-deep-equal';

import { useQuery } from '@tanstack/react-query';
import type { CaseUserActions, CaseExternalService } from '../../common/ui/types';
import type { CaseConnector } from '../../common/api';
import { ActionTypes, NONE_CONNECTOR_ID } from '../../common/api';
import { getCaseUserActions } from './api';
import {
  isPushedUserAction,
  isConnectorUserAction,
  isCreateCaseUserAction,
} from '../../common/utils/user_actions';
import type { ServerError } from '../types';
import { useToasts } from '../common/lib/kibana';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

export interface CaseService extends CaseExternalService {
  firstPushIndex: number;
  lastPushIndex: number;
  commentsToUpdate: string[];
  hasDataToPush: boolean;
}

export interface CaseServices {
  [key: string]: CaseService;
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

export const getProfileUids = (userActions: CaseUserActions[]) => {
  const uids = userActions.reduce<Set<string>>((acc, userAction) => {
    if (userAction.type === ActionTypes.assignees) {
      const uidsFromPayload = userAction.payload.assignees.map((assignee) => assignee.uid);
      for (const uid of uidsFromPayload) {
        acc.add(uid);
      }
    }

    if (
      isPushedUserAction<'camelCase'>(userAction) &&
      userAction.payload.externalService.pushedBy.profileUid != null
    ) {
      acc.add(userAction.payload.externalService.pushedBy.profileUid);
    }

    if (userAction.createdBy.profileUid != null) {
      acc.add(userAction.createdBy.profileUid);
    }

    return acc;
  }, new Set());

  return uids;
};

export const useGetCaseUserActions = (caseId: string, caseConnectorId: string) => {
  const toasts = useToasts();
  const abortCtrlRef = new AbortController();
  return useQuery(
    casesQueriesKeys.userActions(caseId, caseConnectorId),
    async () => {
      const response = await getCaseUserActions(caseId, abortCtrlRef.signal);
      const participants = !isEmpty(response)
        ? uniqBy('createdBy.username', response).map((cau) => cau.createdBy)
        : [];

      const caseUserActions = !isEmpty(response) ? response : [];
      const pushedInfo = getPushedInfo(caseUserActions, caseConnectorId);
      const profileUids = getProfileUids(caseUserActions);

      return {
        caseUserActions,
        participants,
        profileUids,
        ...pushedInfo,
      };
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: ERROR_TITLE }
          );
        }
      },
    }
  );
};

export type UseGetCaseUserActions = ReturnType<typeof useGetCaseUserActions>;
