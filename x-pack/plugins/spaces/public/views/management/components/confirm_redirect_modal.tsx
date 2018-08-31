/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import React from 'react';
import { Space } from '../../../../common/model/space';

interface Props {
  space?: Space;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmRedirectModal = (props: Props) => {
  const { space } = props;

  const buttonText = `Delete current space`;

  const bodyQuestion =
    `You are about to delete your current space ` +
    `(${space.name}). If you continue, you will be redirected to select a different space.`;

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor={'danger'}
        cancelButtonText={'Cancel'}
        confirmButtonText={buttonText}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
        title={`Delete your current space?`}
        defaultFocusedButton={'cancel'}
      >
        <p>{bodyQuestion}</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
