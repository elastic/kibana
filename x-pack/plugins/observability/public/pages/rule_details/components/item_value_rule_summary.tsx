/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import { ItemValueRuleSummaryProps } from '../types';

export function ItemValueRuleSummary({
  itemValue,
  extraSpace = true,
  ...otherProps
}: ItemValueRuleSummaryProps) {
  return (
    <EuiFlexItem grow={extraSpace ? 3 : 1} {...otherProps}>
      <EuiText size="s">{itemValue}</EuiText>
    </EuiFlexItem>
  );
}
