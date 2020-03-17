/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCallOut, EuiConfirmModal, EuiOverlayMask, EuiSpacer } from '@elastic/eui';
import React from 'react';

interface ConfirmPackageInstallProps {
  onCancel: () => void;
  onConfirm: () => void;
  packageName: string;
  numOfAssets: number;
}
export const ConfirmPackageInstall = (props: ConfirmPackageInstallProps) => {
  const { onCancel, onConfirm, packageName, numOfAssets } = props;
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={`Install ${packageName}?`}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel"
        confirmButtonText="Install package"
        defaultFocusedButton="confirm"
      >
        <EuiCallOut title={`This package will install ${numOfAssets} assets.`} />
        <EuiSpacer size="l" />
        <p>
          and will only be accessible to users who have permission to view this Space. Elasticsearch
          assets are installed globally and will be accessible to all Kibana users.
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
