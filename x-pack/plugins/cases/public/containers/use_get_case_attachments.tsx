/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { UseQueryResult } from '@tanstack/react-query';

import { useFilesContext } from '@kbn/shared-ux-file-context';
import { useQuery } from '@tanstack/react-query';

import type { ServerError } from '../types';

import { APP_ID } from '../../common';
import { useToasts } from '../common/lib/kibana';
import { CASES_FILE_KINDS } from '../files';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

export interface GetCaseAttachmentsParams {
  caseId: string;
  page: number;
  perPage: number;
  searchTerm?: string;
}

export const useGetCaseAttachments = ({
  caseId,
  page,
  perPage,
  searchTerm,
}: GetCaseAttachmentsParams): UseQueryResult<{ files: FileJSON[]; total: number }> => {
  const toasts = useToasts();
  const { client: filesClient } = useFilesContext();

  return useQuery(
    casesQueriesKeys.caseAttachments({ caseId, page, perPage, searchTerm }),
    () => {
      return filesClient.list({
        kind: CASES_FILE_KINDS[APP_ID].id,
        page: page + 1,
        ...(searchTerm && { name: searchTerm }),
        perPage,
        meta: { caseId },
      });
    },
    {
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
      },
    }
  );
};
