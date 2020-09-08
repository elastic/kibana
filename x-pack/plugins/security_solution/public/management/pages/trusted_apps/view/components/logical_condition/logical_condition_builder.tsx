/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  CommonProps,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ConditionGroup, ConditionGroupProps } from './components/condition_group';

const BUTTON_MIN_WIDTH = Object.freeze({ minWidth: '95px' });

export type LogicalConditionBuilderProps = CommonProps &
  ConditionGroupProps & {
    onAndClicked: () => void;
    isAndDisabled?: boolean;
  };
export const LogicalConditionBuilder = memo<LogicalConditionBuilderProps>(
  ({
    entries,
    os,
    className,
    isAndDisabled = false,
    onAndClicked,
    onEntryRemove,
    onEntryChange,
    'data-test-subj': dataTestSubj,
  }) => {
    return (
      <div data-test-subj={dataTestSubj} className={className}>
        <div>
          {entries.length === 0 ? (
            <NoEntries />
          ) : (
            <ConditionGroup
              os={os}
              entries={entries}
              onEntryRemove={onEntryRemove}
              onEntryChange={onEntryChange}
            />
          )}
        </div>
        <EuiSpacer size="s" />
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
