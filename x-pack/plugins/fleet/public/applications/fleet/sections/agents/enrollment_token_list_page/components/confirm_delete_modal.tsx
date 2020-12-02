/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiCallOut, EuiOverlayMask } from '@elastic/eui';
import { EnrollmentAPIKey } from '../../../../types';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  enrollmentKey: EnrollmentAPIKey;
}

export const ConfirmEnrollmentTokenDelete = (props: Props) => {
  const { onCancel, onConfirm, enrollmentKey } = props;
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.title', {
          defaultMessage: 'Revoke enrollment token',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.cancelButton', {
          defaultMessage: 'Cancel',
        })}
        confirmButtonText={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.deleteButton', {
          defaultMessage: 'Revoke enrollment token',
        })}
        defaultFocusedButton="confirm"
        buttonColor="danger"
      >
        <EuiCallOut
          title={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.description', {
            defaultMessage:
              'Are your sure you want to revoke {keyName}? Agents that use this token will no longer be able to access policies or send data. ',
            values: {
              keyName: enrollmentKey.name,
            },
          })}
          color="danger"
        />
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
