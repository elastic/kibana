/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { AttachmentType, LENS_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';

import { useKibana, useGetUserCasesPermissions } from '../../lib/kibana';
import { ADD_TO_CASE_SUCCESS } from './translations';
import type { LensAttributes } from './types';

export const useAddToExistingCase = ({
  onAddToCaseClicked,
  lensAttributes,
  timeRange,
}: {
  onAddToCaseClicked?: () => void;
  lensAttributes: LensAttributes | null;
  timeRange: { from: string; to: string } | null;
}) => {
  const userCasesPermissions = useGetUserCasesPermissions();
  const { cases } = useKibana().services;
  const attachments = useMemo(() => {
    return [
      {
        persistableStateAttachmentState: { attributes: lensAttributes, timeRange },
        persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
        type: AttachmentType.persistableState as const,
      },
    ] as CaseAttachmentsWithoutOwner;
  }, [lensAttributes, timeRange]);

  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal({
    onClose: onAddToCaseClicked,
    successToaster: {
      title: ADD_TO_CASE_SUCCESS,
    },
  });

  const onAddToExistingCaseClicked = useCallback(() => {
    if (onAddToCaseClicked) {
      onAddToCaseClicked();
    }
    selectCaseModal.open({ getAttachments: () => attachments });
  }, [attachments, onAddToCaseClicked, selectCaseModal]);

  return {
    onAddToExistingCaseClicked,
    disabled:
      lensAttributes == null ||
      timeRange == null ||
      !userCasesPermissions.create ||
      !userCasesPermissions.read,
  };
};
