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

export interface UseAddToNewCaseProps {
  onClick?: () => void;
  timeRange: { from: string; to: string } | null;
  lensAttributes: LensAttributes | null;
}

export const useAddToNewCase = ({ onClick, timeRange, lensAttributes }: UseAddToNewCaseProps) => {
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

  const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout({
    toastContent: ADD_TO_CASE_SUCCESS,
  });

  const onAddToNewCaseClicked = useCallback(() => {
    if (onClick) {
      onClick();
    }

    createCaseFlyout.open({ attachments });
  }, [attachments, createCaseFlyout, onClick]);

  return {
    onAddToNewCaseClicked,
    disabled:
      lensAttributes == null ||
      timeRange == null ||
      !userCasesPermissions.create ||
      !userCasesPermissions.read,
  };
};
