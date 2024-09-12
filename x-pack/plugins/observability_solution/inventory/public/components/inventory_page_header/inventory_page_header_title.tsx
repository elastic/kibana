/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import React from 'react';

export function InventoryPageHeaderTitle({ title }: { title: string }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiTitle>
        <h1>{title}</h1>
      </EuiTitle>
      <EuiHorizontalRule margin="none" />
    </EuiFlexGroup>
  );
}
