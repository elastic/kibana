/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { isEmpty } from 'lodash';
import type { ActionConnector } from '../../../../common/api';
import { getIssues } from './api';
import type { Issues } from './types';
import * as i18n from './translations';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { ServerError } from '../../../types';
import { connectorsQueriesKeys } from '../constants';

interface Props {
  http: HttpSetup;
  query: string | null;
  actionConnector?: ActionConnector;
}

const SEARCH_DEBOUNCE_MS = 500;

export const useGetIssues = ({ http, actionConnector, query }: Props) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useDebounce(
    () => {
      setDebouncedQuery(query);
    },
    SEARCH_DEBOUNCE_MS,
    [query]
  );

  const { showErrorToast } = useCasesToast();
  return useQuery<ActionTypeExecutorResult<Issues>, ServerError>(
    connectorsQueriesKeys.jiraGetIssues(actionConnector?.id ?? '', debouncedQuery ?? ''),
    () => {
      const abortCtrlRef = new AbortController();
      return getIssues({
        http,
        signal: abortCtrlRef.signal,
        connectorId: actionConnector?.id ?? '',
        title: query ?? '',
      });
    },
    {
      enabled: Boolean(actionConnector) && !isEmpty(query),
      staleTime: 60 * 1000, // one minute
      onSuccess: (res) => {
        if (res.status && res.status === 'error') {
          showErrorToast(new Error(i18n.ISSUES_API_ERROR), {
            title: i18n.ISSUES_API_ERROR,
            toastMessage: `${res.serviceMessage ?? res.message}`,
          });
        }
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ISSUES_API_ERROR });
      },
    }
  );
};

export type UseGetIssues = ReturnType<typeof useGetIssues>;
