/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { ResolvedCase } from './types';
import * as i18n from './translations';
import { useToasts } from '../common/lib/kibana';
import { resolveCase } from './api';
import { ServerError } from '../types';

export const useFetchCase = (caseId: string) => {
  const toasts = useToasts();
  return useQuery<ResolvedCase, ServerError>(
    ['case', caseId],
    () => {
      const abortCtrlRef = new AbortController();
      return resolveCase(caseId, true, abortCtrlRef.signal);
    },
    {
      onError: (error: ServerError) => {
        toasts.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: i18n.ERROR_TITLE,
        });
      },
    }
  );
};

// dummy types to pass typescript check
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useGetCase = (_params: any): any => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UseGetCase = any;
