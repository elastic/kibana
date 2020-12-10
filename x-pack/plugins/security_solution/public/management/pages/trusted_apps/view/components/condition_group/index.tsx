/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHideFor, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { ConditionEntry, OperatingSystem } from '../../../../../../../common/endpoint/types';
import { AndOrBadge } from '../../../../../../common/components/and_or_badge';
import { ConditionEntryInput, ConditionEntryInputProps } from '../condition_entry_input';

const ConditionGroupFlexGroup = styled(EuiFlexGroup)`
  // The positioning of the 'and-badge' is done by using the EuiButton's height and adding on to it
  // the amount of padding used to space out each of the entries (times 2 because a spacer is also
  // used above the Button), and then we adjust it with 3px
  .and-badge {
    padding-top: 20px;
    padding-bottom: ${({ theme }) => {
      return `calc(${theme.eui.euiButtonHeightSmall} + (${theme.eui.paddingSizes.s} * 2) + 3px);`;
    }};
  }

  .group-entries {
    margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};

    & > * {
      margin-bottom: ${({ theme }) => theme.eui.paddingSizes.s};

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .and-button {
    min-width: 95px;
  }
`;

export interface ConditionGroupProps {
  os: OperatingSystem;
  entries: ConditionEntry[];
  onEntryRemove: ConditionEntryInputProps['onRemove'];
  onEntryChange: ConditionEntryInputProps['onChange'];
  onAndClicked: () => void;
  isAndDisabled?: boolean;
  /** called when any of the entries is visited (triggered via `onBlur` DOM event) */
  onVisited?: ConditionEntryInputProps['onVisited'];
  'data-test-subj'?: string;
}
export const ConditionGroup = memo<ConditionGroupProps>(
  ({
    os,
    entries,
    onEntryRemove,
    onEntryChange,
    onAndClicked,
    isAndDisabled,
    onVisited,
    'data-test-subj': dataTestSubj,
  }) => {
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
        <EuiFlexItem grow={1}>
          <div data-test-subj={getTestId('entries')} className="group-entries">
            {(entries as ConditionEntry[]).map((entry, index) => (
              <ConditionEntryInput
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
          </div>
          <div>
            <EuiSpacer size="s" />
            <EuiButton
              fill
              size="s"
              iconType="plusInCircle"
              onClick={onAndClicked}
              data-test-subj={getTestId('AndButton')}
              isDisabled={isAndDisabled}
              className="and-button"
            >
              <FormattedMessage
                id="xpack.securitySolution.trustedapps.logicalConditionBuilder.group.andOperator"
                defaultMessage="AND"
              />
            </EuiButton>
          </div>
        </EuiFlexItem>
      </ConditionGroupFlexGroup>
    );
  }
);

ConditionGroup.displayName = 'ConditionGroup';
