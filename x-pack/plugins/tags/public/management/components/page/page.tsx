/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPageContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

export interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  callToAction?: React.ReactNode;
}

export const Page: React.FC<Props> = ({ title, subtitle, callToAction, children }) => {
  return (
    <EuiPageContent horizontalPosition="center" data-test-subj="TagsManagementPage">
      <EuiFlexGroup justifyContent={'spaceBetween'}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>{title}</h1>
          </EuiTitle>
          {!!subtitle && (
            <EuiText color="subdued" size="s">
              {subtitle}
            </EuiText>
          )}
        </EuiFlexItem>
        {!!callToAction && <EuiFlexItem grow={false}>{callToAction}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {children}
    </EuiPageContent>
  );
};
