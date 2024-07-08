/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiConfirmModal } from '@elastic/eui';

export function UnauthorisedModal({
  isUnauthorizedModalVisible = false,
  onClose,
}: {
  isUnauthorizedModalVisible?: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {isUnauthorizedModalVisible && (
        <EuiConfirmModal
          title={i18n.translate('xpack.apm.eem.unauthorised.title', {
            defaultMessage: 'This feature is turned off',
          })}
          onCancel={onClose}
          onConfirm={onClose}
          confirmButtonText={
            <EuiButton data-test-subj="xpack.apm.unauthorised.button.open" fill size="s">
              {i18n.translate('xpack.apm.unauthorised.button.openSurvey', {
                defaultMessage: 'OK',
              })}
            </EuiButton>
          }
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate('xpack.apm.unauthorised.body', {
              defaultMessage:
                'To detect services from log files and view them in the services inventory, an administrator needs to enable the new logs and services experiences in APM inventory page ',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
}
