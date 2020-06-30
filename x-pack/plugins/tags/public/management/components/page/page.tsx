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
  EuiHorizontalRule,
} from '@elastic/eui';

export interface Props {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  callToAction?: React.ReactNode;
  separator?: boolean;
}

export const Page: React.FC<Props> = ({
  id,
  title,
  subtitle,
  callToAction,
  separator,
  children,
}) => {
  return (
    <EuiPageContent horizontalPosition="center" data-test-subj={`TagsManagementPage-${id}`}>
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
      {!!separator && <EuiHorizontalRule />}
      <EuiSpacer size={separator ? 'm' : 'l'} />
      <div data-test-subj={`TagsManagementPageContent`}>{children}</div>
    </EuiPageContent>
  );
};
