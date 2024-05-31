/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { AttachmentType, LENS_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';

import type { LensProps } from '@kbn/cases-plugin/public/types';
import { APP_ID } from '../../../../common';
import { useKibana } from '../../lib/kibana';
import { ADD_TO_CASE_SUCCESS } from './translations';

export interface UseAddToNewCaseProps {
  onClick?: () => void;
  lensAttributes: LensProps['attributes'] | null;
  timeRange: LensProps['timeRange'] | null;
  lensMetadata?: LensProps['metadata'];
}

export const useAddToNewCase = ({
  onClick,
  timeRange,
  lensAttributes,
  lensMetadata,
}: UseAddToNewCaseProps) => {
  const { cases } = useKibana().services;
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

  const attachments = useMemo(() => {
    return [
      {
        persistableStateAttachmentState: {
          attributes: lensAttributes,
          timeRange,
          metadata: lensMetadata,
        },
        persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
        type: AttachmentType.persistableState as const,
      },
    ] as CaseAttachmentsWithoutOwner;
  }, [lensAttributes, lensMetadata, timeRange]);

  const { open: openCreateCaseFlyout } = cases.hooks.useCasesAddToNewCaseFlyout({
    toastContent: ADD_TO_CASE_SUCCESS,
  });

  const onAddToNewCaseClicked = useCallback(() => {
    if (onClick) {
      onClick();
    }

    openCreateCaseFlyout({ attachments });
  }, [attachments, openCreateCaseFlyout, onClick]);

  return {
    onAddToNewCaseClicked,
    disabled:
      lensAttributes == null ||
      timeRange == null ||
      !userCasesPermissions.create ||
      !userCasesPermissions.read,
  };
};
