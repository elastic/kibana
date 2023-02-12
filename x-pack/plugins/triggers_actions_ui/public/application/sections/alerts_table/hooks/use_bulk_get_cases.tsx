/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core-http-browser';
import type {
  CaseResponse,
  CasesBulkGetRequestCertainFields,
  CasesBulkGetResponseCertainFields,
} from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { INTERNAL_BULK_GET_CASES_URL } from '@kbn/cases-plugin/common';
import { useKibana } from '../../../../common';
import { triggersActionsUiQueriesKeys } from '../../../hooks/constants';
import { ServerError } from '../types';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.cases.api.bulkGet', {
  defaultMessage: 'Error fetching cases data',
});

const caseFields = ['title'] as const;

type Response = CasesBulkGetResponseCertainFields<typeof caseFields[number]>;
export type Cases = Response['cases'];
export type Case = Response['cases'][number];

const transformCases = (data: Response): Map<string, Case> => {
  const casesMap = new Map();

  for (const theCase of data?.cases ?? []) {
    casesMap.set(theCase.id, { ...theCase });
  }

  return casesMap;
};

const bulkGetCases = async <Field extends keyof CaseResponse = keyof CaseResponse>(
  http: HttpStart,
  params: CasesBulkGetRequestCertainFields<Field>,
  signal?: AbortSignal
): Promise<CasesBulkGetResponseCertainFields<Field>> => {
  const res = await http.post<CasesBulkGetResponseCertainFields<Field>>(
    INTERNAL_BULK_GET_CASES_URL,
    {
      body: JSON.stringify({ ...params }),
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

  return useQuery(
    triggersActionsUiQueriesKeys.casesBulkGet(),
    () => {
      const abortCtrlRef = new AbortController();
      // @ts-expect-error: FIX it
      return bulkGetCases(http, { ids: caseIds, fields: caseFields }, abortCtrlRef.signal);
    },
    {
      enabled: caseIds.length > 0,
      select: transformCases,
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
