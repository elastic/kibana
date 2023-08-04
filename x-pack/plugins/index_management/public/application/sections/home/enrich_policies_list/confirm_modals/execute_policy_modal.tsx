/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { executeEnrichPolicy } from '../../../../services/api';
import { useAppContext } from '../../../../app_context';

export const ExecutePolicyModal = ({
  policyToExecute,
  callback,
}: {
  policyToExecute: string;
  callback: (data?: { hasExecutedPolicy: boolean }) => void;
}) => {
  const { toasts } = useAppContext();

  const handleExecutePolicy = () => {
    executeEnrichPolicy(policyToExecute).then(({ data, error }) => {
      if (data) {
        const successMessage = i18n.translate(
          'xpack.idxMgmt.enrich_policies.executeModal.successDeleteNotificationMessage',
          { defaultMessage: 'Executed {policyToExecute}', values: { policyToExecute } }
        );
        toasts.addSuccess(successMessage);

        return callback({ hasExecutedPolicy: true });
      }

      if (error) {
        const errorMessage = i18n.translate(
          'xpack.idxMgmt.enrich_policies.executeModal.errorDeleteNotificationMessage',
          {
            defaultMessage: "Error executing enrich policy: '{error}'",
            values: { error: error.message },
          }
        );
        toasts.addDanger(errorMessage);
      }

      callback();
    });
  };

  const handleOnCancel = () => {
    callback();
  };

  return (
    <EuiConfirmModal
      title="Execute enrich policy"
      onCancel={handleOnCancel}
      onConfirm={handleExecutePolicy}
      cancelButtonText="Cancel"
      confirmButtonText="Execute"
    >
      <p>
        You are about to execute the enrich policy <strong>{policyToExecute}</strong>.
      </p>
    </EuiConfirmModal>
  );
};
