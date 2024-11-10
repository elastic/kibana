/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPageHeader, EuiPanel } from '@elastic/eui';
import React from 'react';

export function StreamsAppPageHeader({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <EuiPanel paddingSize="none" color="transparent">
      <EuiPageHeader>
        <EuiFlexGroup direction="row">
          <EuiPanel hasBorder={false} hasShadow={false} color="transparent">
            {title}
          </EuiPanel>
        </EuiFlexGroup>
      </EuiPageHeader>
      {children}
    </EuiPanel>
  );
}
