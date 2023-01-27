/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, uniqBy } from 'lodash/fp';

import { useQuery } from '@tanstack/react-query';
import type { CaseUserActions } from '../../common/ui/types';
import { ActionTypes } from '../../common/api';
import { getCaseUserActions } from './api';
import { isPushedUserAction } from '../../common/utils/user_actions';
import type { ServerError } from '../types';
import { useToasts } from '../common/lib/kibana';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

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

export const useGetCaseUserActions = (caseId: string) => {
  const toasts = useToasts();
  const abortCtrlRef = new AbortController();
  return useQuery(
    casesQueriesKeys.userActions(caseId),
    async () => {
      const response = await getCaseUserActions(caseId, abortCtrlRef.signal);
      const participants = !isEmpty(response)
        ? uniqBy('createdBy.username', response).map((cau) => cau.createdBy)
        : [];

      const caseUserActions = !isEmpty(response) ? response : [];
      const profileUids = getProfileUids(caseUserActions);

      return {
        caseUserActions,
        participants,
        profileUids,
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
