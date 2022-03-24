/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal } from '@elastic/eui';

import { useServices, useToastNotifications } from '../app_context';
import { executePolicy as executePolicyRequest } from '../services/http';

interface Props {
  children: (executePolicy: ExecutePolicy) => React.ReactElement;
}

export type ExecutePolicy = (name: string, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = () => void;

export const PolicyExecuteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { i18n } = useServices();
  const toastNotifications = useToastNotifications();

  const [policyName, setPolicyName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const executePolicyPrompt: ExecutePolicy = (name, onSuccess = () => undefined) => {
    if (!name || !name.length) {
      throw new Error('No policy name specified for execution');
    }
    setIsModalOpen(true);
    setPolicyName(name);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPolicyName('');
  };
  const executePolicy = () => {
    executePolicyRequest(policyName).then(({ data, error }) => {
      const { snapshotName } = data || { snapshotName: undefined };

      // Surface success notification
      if (snapshotName) {
        const successMessage = i18n.translate(
          'xpack.snapshotRestore.executePolicy.successNotificationTitle',
          {
            defaultMessage: "Policy '{name}' is running",
            values: { name: policyName },
          }
        );
        toastNotifications.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current();
        }
      }

      // Surface error notifications
      if (error) {
        const errorMessage = i18n.translate(
          'xpack.snapshotRestore.executePolicy.errorNotificationTitle',
          {
            defaultMessage: "Error running policy '{name}'",
            values: { name: policyName },
          }
        );
        toastNotifications.addDanger(errorMessage);
      }
    });
    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.executePolicy.confirmModal.executePolicyTitle"
            defaultMessage="Run '{name}' now?"
            values={{ name: policyName }}
          />
        }
        onCancel={closeModal}
        onConfirm={executePolicy}
        cancelButtonText={
          <FormattedMessage
            id="xpack.snapshotRestore.executePolicy.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.snapshotRestore.executePolicy.confirmModal.confirmButtonLabel"
            defaultMessage="Run policy"
          />
        }
        data-test-subj="srExecutePolicyConfirmationModal"
      />
    );
  };

  return (
    <Fragment>
      {children(executePolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
