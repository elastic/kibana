/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as i18n from './translations';
import { deleteCases } from './api';
import type { ServerError } from '../types';
import { casesQueriesKeys, casesMutationsKeys } from './constants';
import { useCasesToast } from '../common/use_cases_toast';

interface MutationArgs {
  caseIds: string[];
  successToasterTitle: string;
}

export const useDeleteCases = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation(
    ({ caseIds }: MutationArgs) => {
      const abortCtrlRef = new AbortController();
      return deleteCases(caseIds, abortCtrlRef.signal);
    },
    {
      mutationKey: casesMutationsKeys.deleteCases,
      onSuccess: (_, { successToasterTitle }) => {
        queryClient.invalidateQueries(casesQueriesKeys.casesList());
        queryClient.invalidateQueries(casesQueriesKeys.tags());
        queryClient.invalidateQueries(casesQueriesKeys.userProfiles());

        showSuccessToast(successToasterTitle);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_DELETING });
      },
    }
  );
};

export type UseDeleteCases = ReturnType<typeof useDeleteCases>;
