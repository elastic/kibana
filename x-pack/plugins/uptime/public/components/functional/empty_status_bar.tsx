/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';

interface Props {
  monitorId: string;
  message?: string;
}

export const EmptyStatusBar = ({ message, monitorId }: Props) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={false}>
        {!message ? `No data found for monitor id ${monitorId}` : message}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
