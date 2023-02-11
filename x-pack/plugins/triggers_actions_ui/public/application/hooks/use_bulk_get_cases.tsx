/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type {
  CaseResponse,
  CasesBulkGetRequestCertainFields,
  CasesBulkGetResponseCertainFields,
} from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { INTERNAL_BULK_GET_CASES_URL } from '@kbn/cases-plugin/common/constants';
import { useKibana } from '../../common';
import { triggersActionsUiQueriesKeys } from './constants';

type ServerError = IHttpFetchError<ResponseErrorBody>;

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.cases.api.bulkGet', {
  defaultMessage: 'Error fetching cases data',
});

const bulkGetCases = async <Field extends keyof CaseResponse = keyof CaseResponse>(
  http: HttpStart,
  params: CasesBulkGetRequestCertainFields<Field>,
  signal?: AbortSignal
): Promise<CasesBulkGetResponseCertainFields<Field>> => {
  const res = await http.post<CasesBulkGetResponseCertainFields<Field>>(
    INTERNAL_BULK_GET_CASES_URL,
    {
      body: JSON.stringify({ params }),
      signal,
    }
  );

  return res;
};

export const useBulkGetCases = (caseIds: string[]) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery<CasesBulkGetResponseCertainFields<'title'>, ServerError>(
    triggersActionsUiQueriesKeys.casesBulkGet(),
    () => {
      const abortCtrlRef = new AbortController();
      return bulkGetCases(http, { ids: caseIds, fields: ['title'] }, abortCtrlRef.signal);
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};

export type UseBulkGetCases = ReturnType<typeof useBulkGetCases>;
