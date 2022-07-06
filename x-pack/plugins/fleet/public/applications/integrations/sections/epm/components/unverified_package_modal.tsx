/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const UnverifiedPackageModal: React.FC<{ onCancel: () => void; onConfirm: () => void }> = ({
  onCancel,
  onConfirm,
}) => {
  // TODO: add link to docs
  return (
    <EuiConfirmModal
      title={
        <span className="eui-textBreakWord">
          <FormattedMessage
            id="xpack.fleet.unverifiedPackageModal.title"
            defaultMessage=" Install unverified integration?"
          />
        </span>
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.unverifiedPackageModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.unverifiedPackageModal.confirmButtonLabel"
          defaultMessage="Install anyway"
        />
      }
      buttonColor="danger"
    >
      <EuiCallOut
        title={i18n.translate('xpack.fleet.unverifiedPackageModal.calloutTitle', {
          defaultMessage: 'The integration has failed verification',
        })}
        color="warning"
        iconType="alert"
        children={
          <FormattedMessage
            id="xpack.fleet.unverifiedPackageModal.calloutBody"
            defaultMessage="This integration contains an unisgned package with unknown authenticity and could contain malicious files. "
          />
        }
      />
    </EuiConfirmModal>
  );
};
