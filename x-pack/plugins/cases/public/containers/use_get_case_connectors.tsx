/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { GetCaseConnectorsResponse } from '../../common/api';
import * as i18n from './translations';
import { getCaseConnectors } from './api';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';
import { useCasesToast } from '../common/use_cases_toast';

export const useGetCaseConnectors = (caseId: string) => {
  const { showErrorToast } = useCasesToast();

  return useQuery<GetCaseConnectorsResponse, ServerError>(
    casesQueriesKeys.caseConnectors(caseId),
    () => {
      const abortCtrlRef = new AbortController();
      return getCaseConnectors(caseId, abortCtrlRef.signal);
    },
    {
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseGetCaseConnectors = ReturnType<typeof useGetCaseConnectors>;
