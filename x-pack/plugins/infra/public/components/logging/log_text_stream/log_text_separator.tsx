/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

/**
 * Create a separator with a text on the right side
 */
export const LogTextSeparator: React.FC = ({ children }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
