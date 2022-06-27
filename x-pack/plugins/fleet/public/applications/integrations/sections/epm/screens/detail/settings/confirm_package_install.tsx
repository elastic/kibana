/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface ConfirmPackageInstallProps {
  onCancel: () => void;
  onConfirm: () => void;
  packageName: string;
  numOfAssets: number;
}
export const ConfirmPackageInstall = (props: ConfirmPackageInstallProps) => {
  const { onCancel, onConfirm, packageName, numOfAssets } = props;
  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.installTitle"
          defaultMessage="Install {packageName}"
          values={{ packageName }}
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.installButtonLabel"
          defaultMessage="Install {packageName}"
          values={{ packageName }}
        />
      }
      defaultFocusedButton="confirm"
    >
      <EuiCallOut
        iconType="iInCircle"
        title={
          <FormattedMessage
            id="xpack.fleet.integrations.settings.confirmInstallModal.installCalloutTitle"
            defaultMessage="This action will install {numOfAssets} assets"
            values={{ numOfAssets }}
          />
        }
      />
      <EuiSpacer size="l" />
      <p>
        <FormattedMessage
          id="xpack.fleet.integrations.settings.confirmInstallModal.installDescription"
          defaultMessage="Kibana assets will be installed in the current Space (Default) and will only be accessible to users who have permission to view this Space. Elasticsearch assets are installed globally and will be accessible to all Kibana users."
        />
      </p>
    </EuiConfirmModal>
  );
};
