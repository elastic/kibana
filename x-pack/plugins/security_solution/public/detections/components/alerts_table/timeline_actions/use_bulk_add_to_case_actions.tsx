/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimelineItem } from '../../../../../common/search_strategy';
import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import { ADD_TO_CASE_DISABLED, ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';

export interface UseAddToCaseActions {
  onClose?: () => void;
  onSuccess?: () => Promise<void>;
}

export const useBulkAddToCaseActions = ({ onClose, onSuccess }: UseAddToCaseActions = {}) => {
  const { cases: casesUi } = useKibana().services;

  const userCasesPermissions = useGetUserCasesPermissions();

  const createCaseFlyout = casesUi.hooks.getUseCasesAddToNewCaseFlyout({
    onClose,
    onSuccess,
  });
  const selectCaseModal = casesUi.hooks.getUseCasesAddToExistingCaseModal({
    onClose,
    onRowClick: onSuccess,
  });

  return useMemo(() => {
    return userCasesPermissions.create && userCasesPermissions.read
      ? [
          {
            label: ADD_TO_NEW_CASE,
            key: 'attach-new-case',
            'data-test-subj': 'attach-new-case',
            disableOnQuery: true,
            disabledLabel: ADD_TO_CASE_DISABLED,
            onClick: (items?: TimelineItem[]) => {
              const caseAttachments = items ? casesUi.helpers.groupAlertsByRule(items) : [];
              createCaseFlyout.open({ attachments: caseAttachments });
            },
          },
          {
            label: ADD_TO_EXISTING_CASE,
            key: 'attach-existing-case',
            disableOnQuery: true,
            disabledLabel: ADD_TO_CASE_DISABLED,
            'data-test-subj': 'attach-existing-case',
            onClick: (items?: TimelineItem[]) => {
              const caseAttachments = items ? casesUi.helpers.groupAlertsByRule(items) : [];
              selectCaseModal.open({ attachments: caseAttachments });
            },
          },
        ]
      : [];
  }, [
    casesUi.helpers,
    createCaseFlyout,
    userCasesPermissions.create,
    userCasesPermissions.read,
    selectCaseModal,
  ]);
};
