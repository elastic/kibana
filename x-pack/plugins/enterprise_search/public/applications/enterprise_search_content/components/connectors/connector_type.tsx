/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import { CONNECTORS } from '../search_index/connector/constants';

export interface ConnectorTypeProps {
  serviceType: string;
}

export const ConnectorType: React.FC<ConnectorTypeProps> = ({ serviceType }) => {
  const connector = CONNECTORS.find((c) => c.serviceType === serviceType);
  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      {connector && connector.icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={connector.icon} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText size="s">
          <p>{connector?.name ?? '-'}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
