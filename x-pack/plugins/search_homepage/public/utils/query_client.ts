/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { QueryClient, MutationCache, QueryCache, MutationKey } from '@tanstack/react-query';
import { MutationKeys } from '../constants';
import { getErrorCode, getErrorMessage, isKibanaServerError } from './get_error_message';

const SkipToastMutations = [MutationKeys.CreateIndex];

function shouldSkipMutationErrorToast(mutationKey: MutationKey | undefined): boolean {
  if (mutationKey === undefined) return false;
  if (Array.isArray(mutationKey) && mutationKey.length > 0) {
    return SkipToastMutations.includes(mutationKey[0]);
  }
  if (typeof mutationKey === 'string') {
    return SkipToastMutations.includes(mutationKey);
  }
  return false;
}

export function initQueryClient(toasts: IToasts): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (shouldSkipMutationErrorToast(mutation.options.mutationKey)) return;
        toasts.addError(error as Error, {
          title: (error as Error).name,
          toastMessage: getErrorMessage(error),
          toastLifeTimeMs: 1000,
        });
      },
    }),
    queryCache: new QueryCache({
      onError: (error) => {
        // 404s are often functionally okay and shouldn't show toasts by default
        if (getErrorCode(error) === 404) {
          return;
        }
        if (isKibanaServerError(error) && !error.skipToast) {
          toasts.addError(error, {
            title: error.name,
            toastMessage: getErrorMessage(error),
            toastLifeTimeMs: 1000,
          });
        }
      },
    }),
  });
}
