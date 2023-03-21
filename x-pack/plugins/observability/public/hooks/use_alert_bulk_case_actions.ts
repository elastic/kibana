/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useGetUserCasesPermissions } from './use_get_user_cases_permissions';
import type { ObservabilityAppServices } from '../application/types';

export interface UseAddToCaseActions {
  onClose?: () => void;
  onSuccess?: () => Promise<void>;
}

export const useBulkAddToCaseActions = ({ onClose, onSuccess }: UseAddToCaseActions = {}) => {
  const { cases: casesUi } = useKibana<ObservabilityAppServices>().services;

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
            label: i18n.translate('xpack.observability.alerts.actions.addToNewCase', {
              defaultMessage: 'Add to new case',
            }),
            key: 'attach-new-case',
            'data-test-subj': 'attach-new-case',
            disableOnQuery: true,
            disabledLabel: i18n.translate('xpack.observability.alerts.actions.addToCaseDisabled', {
              defaultMessage: 'Add to case is not supported for this selection',
            }),
            onClick: (items?: TimelineItem[]) => {
              const caseAttachments = items ? casesUi.helpers.groupAlertsByRule(items) : [];
              createCaseFlyout.open({ attachments: caseAttachments });
            },
          },
          {
            label: i18n.translate('xpack.observability.alerts.actions.addToCase', {
              defaultMessage: 'Add to existing case',
            }),
            key: 'attach-existing-case',
            disableOnQuery: true,
            disabledLabel: i18n.translate('xpack.observability.alerts.actions.addToCaseDisabled', {
              defaultMessage: 'Add to case is not supported for this selection',
            }),
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

/*
 * Wrapper hook to support trigger actions
 * registry props for the alert table
 *
 * */
export const useBulkAddToCaseTriggerActions = () => {
  return useBulkAddToCaseActions({});
};
