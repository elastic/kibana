/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { deleteObservable } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { useRefreshCases } from '../components/all_cases/use_on_refresh_cases';

export const useDeleteObservable = (caseId: string, observableId: string) => {
  const { showErrorToast } = useCasesToast();
  const refreshCases = useRefreshCases();

  return useMutation(
    () => {
      return deleteObservable(caseId, observableId);
    },
    {
      mutationKey: casesMutationsKeys.deleteObservables,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSuccess: () => {
        refreshCaseViewPage();
      },
    }
  );
};

export type UseDeleteObservables = ReturnType<typeof useDeleteObservable>;
