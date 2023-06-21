/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export function DetailViewHeader({
  backLabel,
  backHref,
  title,
}: {
  backLabel: string;
  backHref: string;
  title: string;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
      <EuiFlexItem>
        <EuiLink data-test-subj="apmDetailViewHeaderLink" href={backHref}>
          <EuiFlexGroup direction="row" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type="arrowLeft" />
            </EuiFlexItem>
            <EuiFlexItem>{backLabel}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <EuiText>{title}</EuiText>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
