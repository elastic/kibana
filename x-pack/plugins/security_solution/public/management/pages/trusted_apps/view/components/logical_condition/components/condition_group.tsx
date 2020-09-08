/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TrustedApp } from '../../../../../../../../common/endpoint/types';
import { ConditionEntry, ConditionEntryProps } from './condition_entry';

export interface ConditionGroupProps {
  os: TrustedApp['os'];
  entries: TrustedApp['entries'];
  onEntryRemove: ConditionEntryProps['onRemove'];
  onEntryChange: ConditionEntryProps['onChange'];
}
export const ConditionGroup = memo<ConditionGroupProps>(
  ({ os, entries, onEntryRemove, onEntryChange }) => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>{'AND'}</EuiFlexItem>
        <EuiFlexItem grow={1}>
          {entries.map((entry, index) => (
            <ConditionEntry
              os={os}
              entry={entry}
              showLabels={index === 0}
              isRemoveDisabled={index === 0 && entries.length <= 1}
              onRemove={onEntryRemove}
              onChange={onEntryChange}
            />
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConditionGroup.displayName = 'ConditionGroup';
