/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { KueryNode } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { bulkDeleteRules } from '../lib/rule_api';
import {
  cancelButtonText,
  getConfirmButtonText,
  getConfirmModalText,
  getFailedNotificationText,
  getSuccessfulNotificationText,
} from './translations';

export const RulesDeleteModalConfirmation = ({
  idsToDelete,
  rulesToDeleteFilter,
  numberOfSelectedItems,
  onDeleted,
  onCancel,
  onErrors,
  showWarningText,
  warningText,
  setIsDeletingRules,
}: {
  idsToDelete: string[];
  rulesToDeleteFilter?: KueryNode | null;
  numberOfSelectedItems: number;
  onDeleted: () => Promise<void>;
  onCancel: () => void;
  onErrors: () => Promise<void>;
  setIsDeletingRules: (isLoading: boolean) => void;
  showWarningText?: boolean;
  warningText?: string;
}) => {
  const numberIdsToDelete = idsToDelete.length || numberOfSelectedItems;

  const [deleteModalFlyoutVisible, setDeleteModalVisibility] = useState<boolean>(false);

  const singleTitle = i18n.translate('xpack.triggersActionsUI.sections.rulesList.singleTitle', {
    defaultMessage: 'rule',
  });
  const multipleTitle = i18n.translate('xpack.triggersActionsUI.sections.rulesList.multipleTitle', {
    defaultMessage: 'rules',
  });

  useEffect(() => {
    setDeleteModalVisibility(idsToDelete.length > 0 || Boolean(rulesToDeleteFilter));
  }, [idsToDelete, rulesToDeleteFilter]);

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const onCancelProp = useCallback(() => {
    setDeleteModalVisibility(false);
    onCancel();
  }, [onCancel]);

  const onConfirmProp = useCallback(async () => {
    setDeleteModalVisibility(false);
    setIsDeletingRules(true);
    const { errors, total } = await bulkDeleteRules({
      filter: rulesToDeleteFilter,
      ids: idsToDelete,
      http,
    });
    setIsDeletingRules(false);

    const numErrors = errors.length;
    const numSuccesses = total - numErrors;
    if (numSuccesses > 0) {
      toasts.addSuccess(getSuccessfulNotificationText(numSuccesses, singleTitle, multipleTitle));
    }

    if (numErrors > 0) {
      toasts.addDanger(getFailedNotificationText(numErrors, singleTitle, multipleTitle));
      await onErrors();
    }
    await onDeleted();
  }, [
    http,
    idsToDelete,
    multipleTitle,
    onDeleted,
    onErrors,
    rulesToDeleteFilter,
    setIsDeletingRules,
    singleTitle,
    toasts,
  ]);

  if (!deleteModalFlyoutVisible) {
    return null;
  }

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="rulesDeleteConfirmation"
      title={getConfirmButtonText(numberIdsToDelete, singleTitle, multipleTitle)}
      onCancel={onCancelProp}
      onConfirm={onConfirmProp}
      cancelButtonText={cancelButtonText}
      confirmButtonText={getConfirmButtonText(numberIdsToDelete, singleTitle, multipleTitle)}
    >
      <p>{getConfirmModalText(numberIdsToDelete, singleTitle, multipleTitle)}</p>
      {showWarningText && (
        <EuiCallOut title={<>{warningText}</>} color="warning" iconType="alert" />
      )}
    </EuiConfirmModal>
  );
};
