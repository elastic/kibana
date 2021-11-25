/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import { useCallback, useEffect, useState, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

import {
  CaseFullExternalService,
  CaseConnector,
  CaseExternalService,
  CaseUserActions,
  ElasticUser,
} from '../../common';
import { getCaseUserActions, getSubCaseUserActions } from './api';
import * as i18n from './translations';
import { convertToCamelCase } from './utils';
import { parseStringAsConnector, parseStringAsExternalService } from '../common/user_actions';
import { useToasts } from '../common/lib/kibana';

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
  fetchCaseUserActions: (
    caseId: string,
    caseConnectorId: string,
    subCaseId?: string
  ) => Promise<void>;
}

const unknownExternalServiceConnectorId = 'unknown';

const getExternalService = (
  connectorId: string | null,
  encodedValue: string | null
): CaseExternalService | null => {
  const decodedValue = parseStringAsExternalService(connectorId, encodedValue);

  if (decodedValue == null) {
    return null;
  }
  return {
    ...convertToCamelCase<CaseFullExternalService, CaseExternalService>(decodedValue),
    // if in the rare case that the connector id is null we'll set it to unknown if we need to reference it in the UI
    // anywhere. The id would only ever be null if a migration failed or some logic error within the backend occurred
    connectorId: connectorId ?? unknownExternalServiceConnectorId,
  };
};

const groupConnectorFields = (
  userActions: CaseUserActions[]
): Record<string, Array<CaseConnector['fields']>> =>
  userActions.reduce((acc, mua) => {
    if (mua.actionField[0] !== 'connector') {
      return acc;
    }

    const oldConnector = parseStringAsConnector(mua.oldValConnectorId, mua.oldValue);
    const newConnector = parseStringAsConnector(mua.newValConnectorId, mua.newValue);

    if (!oldConnector || !newConnector) {
      return acc;
    }

    return {
      ...acc,
      [oldConnector.id]: [
        ...(acc[oldConnector.id] || []),
        ...(oldConnector.id === newConnector.id
          ? [oldConnector.fields, newConnector.fields]
          : [oldConnector.fields]),
      ],
      [newConnector.id]: [
        ...(acc[newConnector.id] || []),
        ...(oldConnector.id === newConnector.id
          ? [oldConnector.fields, newConnector.fields]
          : [newConnector.fields]),
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
      (mua) => mua.action === 'push-to-service' && mua.newValConnectorId === connectorId
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

    const externalService = getExternalService(cua.newValConnectorId, cua.newValue);
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
  caseConnectorId: string,
  subCaseId?: string
): UseGetCaseUserActions => {
  const [caseUserActionsState, setCaseUserActionsState] =
    useState<CaseUserActionsState>(initialData);
  const abortCtrlRef = useRef(new AbortController());
  const isCancelledRef = useRef(false);
  const toasts = useToasts();

  const fetchCaseUserActions = useCallback(
    async (thisCaseId: string, thisCaseConnectorId: string, thisSubCaseId?: string) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        setCaseUserActionsState({
          ...caseUserActionsState,
          isLoading: true,
        });

        const response = await (thisSubCaseId
          ? getSubCaseUserActions(thisCaseId, thisSubCaseId, abortCtrlRef.current.signal)
          : getCaseUserActions(thisCaseId, abortCtrlRef.current.signal));

        if (!isCancelledRef.current) {
          // Attention Future developer
          // We are removing the first item because it will always be the creation of the case
          // and we do not want it to simplify our life
          const participants = !isEmpty(response)
            ? uniqBy('actionBy.username', response).map((cau) => cau.actionBy)
            : [];

          const caseUserActions = !isEmpty(response)
            ? thisSubCaseId
              ? response
              : response.slice(1)
            : [];

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
      fetchCaseUserActions(caseId, caseConnectorId, subCaseId);
    }

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, subCaseId]);
  return { ...caseUserActionsState, fetchCaseUserActions };
};
