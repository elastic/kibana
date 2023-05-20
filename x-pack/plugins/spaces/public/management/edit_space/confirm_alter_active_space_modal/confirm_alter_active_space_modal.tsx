/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import React from 'react';

import type { IntlShape } from '@kbn/i18n-react';
import { FormattedMessage, useI18n } from '@kbn/i18n-react';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  intl: IntlShape;
}

const ConfirmAlterActiveSpaceModalUI: React.FC<Props> = (props) => {
  const intl = useI18n();

  return (
    <EuiConfirmModal
      onConfirm={props.onConfirm}
      onCancel={props.onCancel}
      title={
        <FormattedMessage
          id="xpack.spaces.management.confirmAlterActiveSpaceModal.title"
          defaultMessage="Confirm update space"
        />
      }
      defaultFocusedButton={'confirm'}
      cancelButtonText={intl.formatMessage({
        id: 'xpack.spaces.management.confirmAlterActiveSpaceModal.cancelButton',
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={intl.formatMessage({
        id: 'xpack.spaces.management.confirmAlterActiveSpaceModal.updateSpaceButton',
        defaultMessage: 'Update space',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.spaces.management.confirmAlterActiveSpaceModal.reloadWarningMessage"
          defaultMessage="You have updated the visible features in this space. Your page will reload after saving."
        />
      </p>
    </EuiConfirmModal>
  );
};

export const ConfirmAlterActiveSpaceModal = React.memo(ConfirmAlterActiveSpaceModalUI);
