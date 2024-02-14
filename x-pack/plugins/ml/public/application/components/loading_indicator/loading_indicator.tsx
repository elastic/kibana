/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiSpacer } from '@elastic/eui';

export const LoadingIndicator: FC<{ height?: number; label?: string }> = ({ height, label }) => {
  height = height ? +height : 100;
  return (
    <EuiFlexGroup justifyContent="spaceEvenly">
      <EuiFlexItem grow={false}>
        <div style={{ height: `${height}px` }} data-test-subj="mlLoadingIndicator">
          <EuiLoadingChart size="xl" mono />
          {label && (
            <>
              <EuiSpacer size="s" />
              <div>{label}</div>
            </>
          )}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
