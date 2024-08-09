/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { ObservablePatchType } from '../../common/types/domain/observable/v1';
import { postObservables } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { useRefreshCases } from '../components/all_cases/use_on_refresh_cases';

export interface PostObservables {
  caseId: string;
  version: string;
  observables: ObservablePatchType[];
}

export const usePostObservables = () => {
  const { showErrorToast } = useCasesToast();
  const refreshCases = useRefreshCases();

  return useMutation(
    (request: PostObservables) => {
      return postObservables(request, request.caseId);
    },
    {
      mutationKey: casesMutationsKeys.postObservables,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSuccess: () => {
        refreshCases();
      },
    }
  );
};

export type UsePostObservables = ReturnType<typeof usePostObservables>;
