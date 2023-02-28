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
import { ServerError } from '../types';
import { bulkGetCases, Case, CasesBulkGetResponse } from './api';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.cases.api.bulkGet', {
  defaultMessage: 'Error fetching cases data',
});

const caseFields = ['title', 'description', 'status', 'totalComment', 'created_at', 'created_by'];

const transformCases = (data: CasesBulkGetResponse): Map<string, Case> => {
  const casesMap = new Map();

  for (const theCase of data?.cases ?? []) {
    casesMap.set(theCase.id, { ...theCase });
  }

  return casesMap;
};

export const useBulkGetCases = (caseIds: string[]) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    triggersActionsUiQueriesKeys.casesBulkGet(caseIds),
    () => {
      const abortCtrlRef = new AbortController();
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
