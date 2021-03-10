/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutProps, EuiTitle } from '@elastic/eui';
import React from 'react';
import { AlertItem } from './alerts_table';

type AlertsFlyoutProps = AlertItem & EuiFlyoutProps;

export function AlertsFlyout({ onClose, reason }: AlertsFlyoutProps) {
  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader>
        <EuiTitle size="xs">
          <h2>{reason}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
    </EuiFlyout>
  );
}
