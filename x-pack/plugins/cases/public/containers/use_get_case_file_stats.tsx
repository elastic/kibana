/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';

import type { FileJSON } from '@kbn/shared-ux-file-types';

import { useFilesContext } from '@kbn/shared-ux-file-context';
import { useQuery } from '@tanstack/react-query';

import type { Owner } from '../../common/constants/types';
import type { ServerError } from '../types';

import { constructFileKindIdByOwner } from '../../common/files';
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

const getTotalFromFileList = (data: { files: FileJSON[]; total: number }): { total: number } => ({
  total: data.total,
});

interface GetCaseFileStatsParams {
  caseId: string;
}

export const useGetCaseFileStats = ({
  caseId,
}: GetCaseFileStatsParams): UseQueryResult<{ total: number }> => {
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();
  const { client: filesClient } = useFilesContext();

  return useQuery(
    casesQueriesKeys.caseFileStats(caseId),
    () => {
      return filesClient.list({
        kind: constructFileKindIdByOwner(owner[0] as Owner),
        page: 1,
        perPage: 1,
        meta: { caseIds: [caseId] },
      });
    },
    {
      select: getTotalFromFileList,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
