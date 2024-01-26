/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { casesMutationsKeys } from './constants';
import type { ServerError } from '../types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useCasesToast } from '../common/use_cases_toast';
import { deleteFileAttachments } from './api';
import * as i18n from './translations';

interface MutationArgs {
  caseId: string;
  fileId: string;
}

export const useDeleteFileAttachment = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshAttachmentsTable = useRefreshCaseViewPage();

  return useMutation(
    ({ caseId, fileId }: MutationArgs) => deleteFileAttachments({ caseId, fileIds: [fileId] }),
    {
      mutationKey: casesMutationsKeys.deleteFileAttachment,
      onSuccess: () => {
        showSuccessToast(i18n.FILE_DELETE_SUCCESS);
        refreshAttachmentsTable();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_DELETING_FILE });
      },
    }
  );
};
