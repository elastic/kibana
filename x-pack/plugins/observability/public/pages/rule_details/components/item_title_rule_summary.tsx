/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ItemTitleRuleSummaryProps } from '../types';

export function ItemTitleRuleSummary({ children }: ItemTitleRuleSummaryProps) {
  return (
    <EuiTitle size="xxs">
      <EuiFlexItem style={{ whiteSpace: 'nowrap' }} grow={1}>
        {children}
      </EuiFlexItem>
    </EuiTitle>
  );
}
