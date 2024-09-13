/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import { patchCase } from './api';
import * as i18n from './translations';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import type { ServerError } from '../types';
import type { UpdateByKey } from './types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { createUpdateSuccessToaster } from './utils';
import { useToasts } from '../common/lib/kibana';

export const useUpdateCase = () => {
  const toasts = useToasts();
  const { showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    (request: UpdateByKey) =>
      patchCase({
        caseId: request.caseData.id,
        updatedCase: { [request.updateKey]: request.updateValue },
        version: request.caseData.version,
      }),
    {
      mutationKey: casesMutationsKeys.updateCase,
      onSuccess: (response, request) => {
        refreshCaseViewPage();
        const successToaster = createUpdateSuccessToaster(
          request.caseData,
          response[0],
          request.updateKey,
          request.updateValue
        );

        toasts.addSuccess(successToaster);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseUpdateCase = ReturnType<typeof useUpdateCase>;
