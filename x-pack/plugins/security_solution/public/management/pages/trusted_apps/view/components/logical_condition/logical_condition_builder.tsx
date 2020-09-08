/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, CommonProps, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { NewTrustedApp } from '../../../../../../../common/endpoint/types';
import { ConditionGroup } from './components/condition_group';

const BUTTON_MIN_WIDTH = Object.freeze({ minWidth: '95px' });

interface LogicalConditionBuilderProps extends CommonProps {
  os: NewTrustedApp['os'];
  entries: NewTrustedApp['entries'];
  onAndClicked: () => void;
  isAndDisabled?: boolean;
  onEntryRemove: (entry: NewTrustedApp['entries'][0]) => void;
}

export const LogicalConditionBuilder = memo<LogicalConditionBuilderProps>(
  ({
    entries,
    os,
    className,
    isAndDisabled = false,
    onAndClicked,
    onEntryRemove,
    'data-test-subj': dataTestSubj,
  }) => {
    return (
      <div data-test-subj={dataTestSubj} className={className}>
        <div>
          {entries.length === 0 ? (
            <NoEntries />
          ) : (
            <ConditionGroup os={os} entries={entries} onEntryRemove={onEntryRemove} />
          )}
        </div>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              iconType="plusInCircle"
              onClick={onAndClicked}
              data-test-subj={`${dataTestSubj ? `${dataTestSubj}-AndButton` : undefined}`}
              isDisabled={isAndDisabled}
              style={BUTTON_MIN_WIDTH}
            >
              <FormattedMessage
                id="xpack.securitySolution.trustedapps.logicalConditionBuilder.andOperator"
                defaultMessage="AND"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);

LogicalConditionBuilder.displayName = 'LogicalConditionBuilder';

// FIXME:PT need to style this better.
const NoEntries = memo(() => {
  return (
    <div>
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.logicalConditionBuilder.noEntries"
          defaultMessage="No entries"
        />
      </EuiText>
    </div>
  );
});

NoEntries.displayName = 'NoEntries';
