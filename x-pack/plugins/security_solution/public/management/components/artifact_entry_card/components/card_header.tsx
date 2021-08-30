/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { DateField } from './date_field';

export const CardHeader = memo<{
  name: string;
  createdDate: string;
  updatedDate: string;
  /** If defined, then an overflow menu will be shown with the actions provided */
  actions?: string[];
}>(({ name, createdDate, updatedDate, actions }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={true}>
        <EuiTitle size="s">
          <h3>{name}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <DateField date={updatedDate} type="update" />
          </EuiFlexItem>
          <EuiFlexItem>
            <DateField date={createdDate} type="create" />
          </EuiFlexItem>
          {actions && <EuiFlexItem>Menu</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

CardHeader.displayName = 'CardHeader';
