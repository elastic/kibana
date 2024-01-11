/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { CasePostRequest } from '../../common/types/api';
import { postCase } from './api';
import * as i18n from './translations';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { casesMutationsKeys } from './constants';
import { useRefreshCases } from '../components/all_cases/use_on_refresh_cases';

interface MutationArgs {
  request: CasePostRequest;
}

export const usePostCase = () => {
  const { showErrorToast } = useCasesToast();
  const refreshCases = useRefreshCases();

  return useMutation(({ request }: MutationArgs) => postCase({ newCase: request }), {
    mutationKey: casesMutationsKeys.createCase,
    onSuccess: () => {
      refreshCases();
    },
    onError: (error: ServerError) => {
      showErrorToast(error, { title: i18n.ERROR_CREATING_CASE });
    },
  });
};

export type UsePostCase = ReturnType<typeof usePostCase>;
