/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel } from '@elastic/eui';
import moment from 'moment';
import React from 'react';

interface Props {
  duration?: number;
  host?: string;
  port?: string;
  scheme?: string;
  status?: string;
  timestamp?: string;
}

export const StatusBar = ({ timestamp, host, port, duration, scheme, status }: Props) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>Status&#58;</EuiFlexItem>
          <EuiFlexItem>
            <EuiHealth
              color={status === 'up' ? 'success' : 'danger'}
              style={{ lineHeight: 'inherit' }}
            >
              {status === 'up' ? 'Up' : 'Down'}
            </EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>Last update: {moment(timestamp).fromNow()}</EuiFlexItem>
      <EuiFlexItem grow={false}>Host: {host}</EuiFlexItem>
      <EuiFlexItem grow={false}>Port: {port}</EuiFlexItem>
      <EuiFlexItem grow={false}>Duration: {duration === 0 ? 'N/A' : `${duration}ms`}</EuiFlexItem>
      <EuiFlexItem>Scheme: {scheme}</EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
