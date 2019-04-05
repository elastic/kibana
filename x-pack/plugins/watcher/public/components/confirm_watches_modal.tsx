/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const ConfirmWatchesModal = ({
  modalOptions,
  callback,
}: {
  modalOptions: { title: string; message: string } | null;
  callback: (isConfirmed?: boolean) => void;
}) => {
  if (!modalOptions) {
    return null;
  }
  const { title, message } = modalOptions;
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        title={title}
        onCancel={() => callback()}
        onConfirm={() => {
          callback(true);
        }}
        cancelButtonText={i18n.translate(
          'xpack.watcher.sections.watchEdit.json.saveConfirmModal.cancelButtonLabel',
          { defaultMessage: 'Cancel' }
        )}
        confirmButtonText={i18n.translate(
          'xpack.watcher.sections.watchEdit.json.saveConfirmModal.saveButtonLabel',
          { defaultMessage: 'Save' }
        )}
      >
        {message}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
