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
  spaces: Space[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal = (props: Props) => {
  const { spaces } = props;

  const buttonText = spaces.length > 1 ? `Delete ${spaces.length} spaces` : `Delete space`;

  const bodyQuestion =
    spaces.length > 1
      ? `Are you sure you want to delete these ${spaces.length} spaces?`
      : `Are you sure you want to delete this space?`;

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor={'danger'}
        cancelButtonText={'Cancel'}
        confirmButtonText={buttonText}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
        title={`Confirm Delete`}
        defaultFocusedButton={'cancel'}
      >
        <p>{bodyQuestion}</p>
        <p>This operation cannot be undone!</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
