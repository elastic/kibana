/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiButton, CommonProps, EuiText, EuiSpacer, EuiPanel } from '@elastic/eui';
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
              onVisited={onVisited}
              data-test-subj={getTestId('group1')}
            />
          )}
        </div>
        <EuiSpacer size="s" />
        <EuiButton
          fill
          size="s"
          iconType="plusInCircle"
          onClick={onAndClicked}
          data-test-subj={getTestId('AndButton')}
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

const NoEntries = memo(() => {
  return (
    <EuiPanel paddingSize="l">
      <EuiText textAlign="center" size="s" color="subdued">
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.logicalConditionBuilder.noEntries"
          defaultMessage="No conditions defined"
        />
      </EuiText>
    </EuiPanel>
  );
});

NoEntries.displayName = 'NoEntries';
