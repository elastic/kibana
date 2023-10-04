/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { createAttachments } from './api';
import * as i18n from './translations';
import type { CaseAttachmentsWithoutOwner, ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';

export interface PostComment {
  caseId: string;
  caseOwner: string;
  attachments: CaseAttachmentsWithoutOwner;
}

export const useCreateAttachments = () => {
  const { showErrorToast } = useCasesToast();

  return useMutation(
    (request: PostComment) => {
      const attachments = request.attachments.map((attachment) => ({
        ...attachment,
        owner: request.caseOwner,
      }));

      return createAttachments({ attachments, caseId: request.caseId });
    },
    {
      mutationKey: casesMutationsKeys.bulkCreateAttachments,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseCreateAttachments = ReturnType<typeof useCreateAttachments>;
