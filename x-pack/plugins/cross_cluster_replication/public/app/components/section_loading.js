/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText, EuiTextColor } from '@elastic/eui';

export function SectionLoading({ children, dataTestSubj = '' }) {
  return (
    <EuiFlexGroup
      justifyContent="flexStart"
      alignItems="center"
      gutterSize="s"
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="m" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText>
          <EuiTextColor color="subdued">{children}</EuiTextColor>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
