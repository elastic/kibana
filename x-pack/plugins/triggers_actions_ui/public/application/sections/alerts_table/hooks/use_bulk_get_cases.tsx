/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../../common';
import { triggersActionsUiQueriesKeys } from '../../../hooks/constants';
import { AlertsTableQueryContext } from '../contexts/alerts_table_context';
import { ServerError } from '../types';
import { bulkGetCases, Case, CasesBulkGetResponse } from './apis/bulk_get_cases';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.cases.api.bulkGet', {
  defaultMessage: 'Error fetching cases data',
});

const transformCases = (data: CasesBulkGetResponse): Map<string, Case> => {
  const casesMap = new Map();

  for (const theCase of data?.cases ?? []) {
    casesMap.set(theCase.id, { ...theCase });
  }

  return casesMap;
};

export const useBulkGetCases = (caseIds: string[], fetchCases: boolean) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    triggersActionsUiQueriesKeys.casesBulkGet(caseIds),
    ({ signal }) => bulkGetCases(http, { ids: caseIds }, signal),
    {
      context: AlertsTableQueryContext,
      enabled: caseIds.length > 0 && fetchCases,
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
