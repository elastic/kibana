/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { ExperimentalBadge } from '../../../components/shared/experimental_badge';
import { PageHeaderProps } from '../types';

export function PageTitle({ rule }: PageHeaderProps) {
  return (
    <>
      {/* TODO: Add return back to rule navigation button */}
      {rule.name} <ExperimentalBadge />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem component="span" grow={false}>
          {/* TODO: formate dates */}
          <EuiText color="subdued" size="s">
            <b>Last updated</b> by {rule.updatedBy} on {rule.updatedAt} &emsp;
            <b>Created</b> by {rule.createdBy} on {rule.createdAt}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ alignSelf: 'flexStart' }} component="span" grow={false}>
          <EuiPanel hasShadow={false} hasBorder={true} paddingSize={'none'}>
            <EuiButtonEmpty iconType="tag" color="text">
              {rule.tags.length}
            </EuiButtonEmpty>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
