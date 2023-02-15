/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { FindCaseUserActions } from '../../common/ui/types';
import { findCaseUserActions } from './api';
import type { ServerError } from '../types';
import { useToasts } from '../common/lib/kibana';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

export const useFindCaseUserActions = (caseId: string) => {
  const toasts = useToasts();
  const abortCtrlRef = new AbortController();

  return useQuery<FindCaseUserActions, ServerError>(
    casesQueriesKeys.userActions(caseId),
    async () => {
      return findCaseUserActions(caseId, abortCtrlRef.signal);
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

export type UseFindCaseUserActions = ReturnType<typeof useFindCaseUserActions>;
