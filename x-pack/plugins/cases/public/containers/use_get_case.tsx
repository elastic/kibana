/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useToasts } from '../common/lib/kibana';
import type { ServerError } from '../types';
import { resolveCase } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';
import type { ResolvedCase } from './types';

export const useGetCase = (caseId: string) => {
  const toasts = useToasts();
  return useQuery<ResolvedCase, ServerError>(
    casesQueriesKeys.case(caseId),
    ({ signal }) => resolveCase({ caseId, includeComments: true, signal }),
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};

export type UseGetCase = ReturnType<typeof useGetCase>;
