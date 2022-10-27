/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { KueryNode } from '@kbn/es-query';
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

  useEffect(() => {
    setDeleteModalVisibility(idsToDelete.length > 0 || Boolean(rulesToDeleteFilter));
  }, [idsToDelete, rulesToDeleteFilter]);

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  if (!deleteModalFlyoutVisible) {
    return null;
  }

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="rulesDeleteConfirmation"
      title={getConfirmButtonText(numberIdsToDelete)}
      onCancel={() => {
        setDeleteModalVisibility(false);
        onCancel();
      }}
      onConfirm={async () => {
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
          toasts.addSuccess(getSuccessfulNotificationText(numSuccesses));
        }

        if (numErrors > 0) {
          toasts.addDanger(getFailedNotificationText(numErrors));
          await onErrors();
        }
        await onDeleted();
      }}
      cancelButtonText={cancelButtonText}
      confirmButtonText={getConfirmButtonText(numberIdsToDelete)}
    >
      <p>{getConfirmModalText(numberIdsToDelete)}</p>
      {showWarningText && (
        <EuiCallOut title={<>{warningText}</>} color="warning" iconType="alert" />
      )}
    </EuiConfirmModal>
  );
};
