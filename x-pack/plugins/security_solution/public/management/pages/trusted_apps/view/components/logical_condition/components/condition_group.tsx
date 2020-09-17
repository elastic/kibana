/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { NewTrustedApp, TrustedApp } from '../../../../../../../../common/endpoint/types';
import { ConditionEntry, ConditionEntryProps } from './condition_entry';
import { AndOrBadge } from '../../../../../../../common/components/and_or_badge';

const AndBadgeFlexItem = styled(EuiFlexItem)`
  padding-top: 20px;
`;

export interface ConditionGroupProps {
  os: TrustedApp['os'];
  entries: TrustedApp['entries'];
  onEntryRemove: ConditionEntryProps['onRemove'];
  onEntryChange: ConditionEntryProps['onChange'];
  'data-test-subj'?: string;
}
export const ConditionGroup = memo<ConditionGroupProps>(
  ({ os, entries, onEntryRemove, onEntryChange, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useCallback(
      (suffix: string): string | undefined => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );
    return (
      <EuiFlexGroup gutterSize="xs" data-test-subj={dataTestSubj}>
        {entries.length > 1 && (
          <AndBadgeFlexItem grow={false}>
            <AndOrBadge type={'and'} includeAntennas={true} />
          </AndBadgeFlexItem>
        )}
        <EuiFlexItem grow={1}>
          {(entries as (NewTrustedApp & { os: 'windows' })['entries']).map((entry, index) => (
            <ConditionEntry
              key={index}
              os={os}
              entry={entry}
              showLabels={index === 0}
              isRemoveDisabled={index === 0 && entries.length <= 1}
              onRemove={onEntryRemove}
              onChange={onEntryChange}
              data-test-subj={getTestId(`entry${index}`)}
            />
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConditionGroup.displayName = 'ConditionGroup';
