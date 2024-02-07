/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import type { ServerError } from '../types';
import { updateCustomField } from './api';
import { casesMutationsKeys } from './constants';
import * as i18n from './translations';

interface UpdateCustomField {
  caseId: string;
  customFieldId: string;
  customFieldValue: string;
  caseVersion: string;
}

export const useUpdateCustomField = () => {
  const { showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    ({ caseId, customFieldId, customFieldValue, caseVersion }: UpdateCustomField) =>
      updateCustomField({
        caseId,
        customFieldId,
        request: { value: customFieldValue, caseVersion },
      }),
    {
      mutationKey: casesMutationsKeys.updateCustomField,
      onSuccess: () => {
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseUpdateCustomField = ReturnType<typeof useUpdateCustomField>;
