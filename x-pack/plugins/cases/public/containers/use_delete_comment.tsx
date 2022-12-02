/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useToasts } from '../common/lib/kibana';
import { casesMutationsKeys } from './constants';
import type { ServerError } from '../types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { deleteComment } from './api';
import * as i18n from './translations';

interface MutationArgs {
  caseId: string;
  commentId: string;
}

export const useDeleteComment = () => {
  const toasts = useToasts();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    ({ caseId, commentId }: MutationArgs) => {
      const abortCtrlRef = new AbortController();
      return deleteComment({ caseId, commentId, signal: abortCtrlRef.signal });
    },
    {
      mutationKey: casesMutationsKeys.deleteComment,
      onSuccess: () => {
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        toasts.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: i18n.ERROR_TITLE,
        });
      },
    }
  );
};

export type UseDeleteComment = ReturnType<typeof useDeleteComment>;
