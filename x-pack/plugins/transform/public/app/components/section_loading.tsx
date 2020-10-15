/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
} from '@elastic/eui';

interface Props {
  inline?: boolean;
  children: React.ReactNode;
  [key: string]: any;
}

export const SectionLoading: React.FunctionComponent<Props> = ({ inline, children, ...rest }) => {
  if (inline) {
    return (
      <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText {...rest}>
            <EuiTextColor color="subdued">{children}</EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiEmptyPrompt
      title={<EuiLoadingSpinner size="xl" />}
      body={<EuiText color="subdued">{children}</EuiText>}
      data-test-subj="sectionLoading"
    />
  );
};
