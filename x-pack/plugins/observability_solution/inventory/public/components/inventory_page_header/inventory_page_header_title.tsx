/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import React from 'react';

export function InventoryPageHeaderTitle({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiTitle>
          <h1>{title}</h1>
        </EuiTitle>
        {children}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="none" />
    </EuiFlexGroup>
  );
}
