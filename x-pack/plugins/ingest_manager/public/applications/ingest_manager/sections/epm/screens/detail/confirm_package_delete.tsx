/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCallOut, EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import React from 'react';

interface ConfirmPackageDeleteProps {
  onCancel: () => void;
  onConfirm: () => void;
  packageName: string;
  numOfAssets: number;
}
export const ConfirmPackageDelete = (props: ConfirmPackageDeleteProps) => {
  const { onCancel, onConfirm, packageName, numOfAssets } = props;
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={`Delete ${packageName}?`}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel"
        confirmButtonText="Delete package"
        defaultFocusedButton="confirm"
        buttonColor="danger"
      >
        <EuiCallOut title={`This package will delete ${numOfAssets} assets.`} color="danger" />
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
