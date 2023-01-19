/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { GetCaseConnectorsResponse } from '../../common/api';
import * as i18n from './translations';
import { useToasts } from '../common/lib/kibana';
import { getCaseConnectors } from './api';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';

export const useGetCaseConnectors = (caseId: string) => {
  const toasts = useToasts();
  return useQuery<GetCaseConnectorsResponse, ServerError>(
    casesQueriesKeys.case(caseId),
    () => {
      const abortCtrlRef = new AbortController();
      return getCaseConnectors(caseId, abortCtrlRef.signal);
    },
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

export type UseGetCaseConnectors = ReturnType<typeof useGetCaseConnectors>;
