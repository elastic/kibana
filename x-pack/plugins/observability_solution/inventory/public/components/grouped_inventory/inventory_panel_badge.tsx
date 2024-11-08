/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';

export function InventoryPanelBadge({
  name,
  value,
  'data-test-subj': dataTestSubj,
}: {
  name: string;
  'data-test-subj'?: string;
  value: string | number;
}) {
  return (
    <EuiFlexGroup data-test-subj={dataTestSubj} gutterSize="s" alignItems="center">
      <EuiFlexItem>
        <EuiText size="xs">
          <strong>{name}:</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBadge color="hollow">{value}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
