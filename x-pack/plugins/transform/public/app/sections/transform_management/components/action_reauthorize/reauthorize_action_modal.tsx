/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EUI_MODAL_CONFIRM_BUTTON, EuiConfirmModal } from '@elastic/eui';
import { StartAction } from '../action_start/use_start_action';

export const ReauthorizeActionModal: FC<StartAction> = ({
  closeModal,
  items,
  startAndCloseModal,
}) => {
  const isBulkAction = items.length > 1;

  const bulkStartModalTitle = i18n.translate('xpack.transform.transformList.bulkStartModalTitle', {
    defaultMessage: 'Re-authorize {count} {count, plural, one {transform} other {transforms}}?',
    values: { count: items && items.length },
  });
  const startModalTitle = i18n.translate('xpack.transform.transformList.startModalTitle', {
    defaultMessage: 'Re-authorize {transformId}?',
    values: { transformId: items[0] && items[0].config.id },
  });

  return (
    <EuiConfirmModal
      data-test-subj="transformReauthorizeModal"
      title={isBulkAction === true ? bulkStartModalTitle : startModalTitle}
      onCancel={closeModal}
      onConfirm={startAndCloseModal}
      cancelButtonText={i18n.translate('xpack.transform.transformList.startModalCancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.transform.transformList.startModalStartButton', {
        defaultMessage: 'Re-authorize',
      })}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      buttonColor="primary"
    >
      <p>
        {i18n.translate('xpack.transform.transformList.startModalBody', {
          defaultMessage:
            'Re-authorize will update the permissions to the current user and start the transform. Starting a transform increases search and indexing load in your cluster. If excessive load is experienced, stop the transform.',
        })}
      </p>
    </EuiConfirmModal>
  );
};
