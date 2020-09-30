/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHideFor } from '@elastic/eui';
import styled from 'styled-components';
import { NewTrustedApp, TrustedApp } from '../../../../../../../../common/endpoint/types';
import { ConditionEntry, ConditionEntryProps } from './condition_entry';
import { AndOrBadge } from '../../../../../../../common/components/and_or_badge';

const ConditionGroupFlexGroup = styled(EuiFlexGroup)`
  .and-badge {
    padding-top: 20px;
  }

  .group-entries > * {
    margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export interface ConditionGroupProps {
  os: TrustedApp['os'];
  entries: TrustedApp['entries'];
  onEntryRemove: ConditionEntryProps['onRemove'];
  onEntryChange: ConditionEntryProps['onChange'];
  /** called when any of the entries is visited (triggered via `onBlur` DOM event) */
  onVisited?: ConditionEntryProps['onVisited'];
  'data-test-subj'?: string;
}
export const ConditionGroup = memo<ConditionGroupProps>(
  ({ os, entries, onEntryRemove, onEntryChange, onVisited, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useCallback(
      (suffix: string): string | undefined => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );
    return (
      <ConditionGroupFlexGroup gutterSize="xs" data-test-subj={dataTestSubj}>
        {entries.length > 1 && (
          <EuiHideFor sizes={['xs', 's']}>
            <EuiFlexItem
              grow={false}
              data-test-subj={getTestId('andConnector')}
              className="and-badge"
            >
              <AndOrBadge type={'and'} includeAntennas={true} />
            </EuiFlexItem>
          </EuiHideFor>
        )}
        <EuiFlexItem grow={1} data-test-subj={getTestId('entries')} className="group-entries">
          {(entries as (NewTrustedApp & { os: 'windows' })['entries']).map((entry, index) => (
            <ConditionEntry
              key={index}
              os={os}
              entry={entry}
              showLabels={index === 0}
              isRemoveDisabled={index === 0 && entries.length <= 1}
              onRemove={onEntryRemove}
              onChange={onEntryChange}
              onVisited={onVisited}
              data-test-subj={getTestId(`entry${index}`)}
            />
          ))}
        </EuiFlexItem>
      </ConditionGroupFlexGroup>
    );
  }
);

ConditionGroup.displayName = 'ConditionGroup';
