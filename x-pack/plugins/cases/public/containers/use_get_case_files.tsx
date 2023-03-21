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
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { CASES_FILE_KINDS } from '../files';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

export interface GetCaseFilesParams {
  caseId: string;
  page: number;
  perPage: number;
  searchTerm?: string;
}

export const useGetCaseFiles = ({
  caseId,
  page,
  perPage,
  searchTerm,
}: GetCaseFilesParams): UseQueryResult<{ files: FileJSON[]; total: number }> => {
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();
  const { client: filesClient } = useFilesContext();

  return useQuery(
    casesQueriesKeys.caseFiles({ caseId, page, perPage, searchTerm, owner: owner[0] }),
    () => {
      return filesClient.list({
        kind: CASES_FILE_KINDS[APP_ID].id,
        page: page + 1,
        ...(searchTerm && { name: `*${searchTerm}*` }),
        perPage,
        meta: { caseId, owner: owner[0] },
      });
    },
    {
      keepPreviousData: true,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
