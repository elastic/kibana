/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

/**
 * Create a separator with a text on the right side
 */
export const LogTextSeparator: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule aria-hidden="true" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
