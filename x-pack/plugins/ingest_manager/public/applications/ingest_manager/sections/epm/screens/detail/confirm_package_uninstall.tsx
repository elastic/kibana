/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCallOut, EuiConfirmModal, EuiOverlayMask, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

interface ConfirmPackageUninstallProps {
  onCancel: () => void;
  onConfirm: () => void;
  packageName: string;
  numOfAssets: number;
}
export const ConfirmPackageUninstall = (props: ConfirmPackageUninstallProps) => {
  const { onCancel, onConfirm, packageName, numOfAssets } = props;
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.ingestManager.integrations.settings.confirmUninstallModal.uninstallTitle"
            defaultMessage="Uninstall {packageName}"
            values={{ packageName }}
          />
        }
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={
          <FormattedMessage
            id="xpack.ingestManager.integrations.settings.confirmUninstallModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.ingestManager.integrations.settings.confirmUninstallModal.uninstallButtonLabel"
            defaultMessage="Uninstall {packageName}"
            values={{ packageName }}
          />
        }
        defaultFocusedButton="confirm"
        buttonColor="danger"
      >
        <EuiCallOut
          color="danger"
          title={
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.confirmUninstallModal.uninstallCallout.title"
              defaultMessage="This action will remove {numOfAssets} assets"
              values={{ numOfAssets }}
            />
          }
        >
          <p>
            <FormattedMessage
              id="xpack.ingestManager.integrations.settings.confirmUninstallModal.uninstallCallout.description"
              defaultMessage="Kibana and Elasticsearch assets that were created by this integration will be removed. Agents configurations and any data sent by your agents will not be effected."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="l" />
        <p>
          <FormattedMessage
            id="xpack.ingestManager.integrations.settings.confirmUninstallModal.uninstallDescription"
            defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
          />
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
