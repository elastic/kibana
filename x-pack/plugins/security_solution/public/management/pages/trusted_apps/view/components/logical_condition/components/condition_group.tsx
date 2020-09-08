/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TrustedApp } from '../../../../../../../../common/endpoint/types';
import { ConditionEntry } from './condition_entry';

interface ConditionGroupProps {
  os: TrustedApp['os'];
  entries: TrustedApp['entries'];
}
export const ConditionGroup = memo<ConditionGroupProps>(({ os, entries }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>{'AND'}</EuiFlexItem>
      <EuiFlexItem grow={1}>
        {entries.map((entry, index) => (
          <ConditionEntry
            os={os}
            entry={entry}
            showLabels={index === 0}
            isRemoveDisabled={index === 0}
          />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

ConditionGroup.displayName = 'ConditionGroup';
