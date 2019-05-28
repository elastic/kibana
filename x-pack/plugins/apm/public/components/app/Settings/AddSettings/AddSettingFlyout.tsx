/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
import { AddSettingFlyoutBody } from './AddSettingFlyoutBody';

interface Props {
  onClose: () => void;
  onSubmit: () => void;
  isOpen: boolean;
}

export function AddSettingsFlyout({ onClose, isOpen, onSubmit }: Props) {
  if (!isOpen) {
    return null;
  }
  return (
    <EuiPortal>
      <EuiFlyout size="s" onClose={onClose} ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2>Agent configuration</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <AddSettingFlyoutBody onSubmit={onSubmit} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
