/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { executeEnrichPolicy } from '../../../../services/api';
import { useAppContext } from '../../../../app_context';

export const ExecutePolicyModal = ({
  policyToExecute,
  callback,
}: {
  policyToExecute: string;
  callback: (data?: { hasExecutedPolicy: boolean }) => void;
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { toasts } = useAppContext();

  const handleExecutePolicy = () => {
    setIsExecuting(true);

    executeEnrichPolicy(policyToExecute)
      .then(({ data, error }) => {
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
      })
      .finally(() => setIsExecuting(false));
  };

  const handleOnCancel = () => {
    callback();
  };

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.idxMgmt.enrich_policies.executeModal.confirmTitle', {
        defaultMessage: 'Execute enrich policy',
      })}
      onCancel={handleOnCancel}
      onConfirm={handleExecutePolicy}
      cancelButtonText={i18n.translate('xpack.idxMgmt.enrich_policies.executeModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.idxMgmt.enrich_policies.executeModal.executeButton',
        { defaultMessage: 'Execute' }
      )}
      confirmButtonDisabled={isExecuting}
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.enrich_policies.executeModal.bodyCopy"
          defaultMessage="You are about to execute the enrich policy {policy}."
          values={{
            policy: <strong>{policyToExecute}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
