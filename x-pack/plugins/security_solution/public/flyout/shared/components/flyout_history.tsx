/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo, useState } from 'react';
import { EuiFlexItem, EuiButtonEmpty, EuiPopover, EuiContextMenuPanel } from '@elastic/eui';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { FlyoutHistoryRow } from './flyout_history_row';
import {
  FLYOUT_HISTORY_TEST_ID,
  FLYOUT_HISTORY_BUTTON_TEST_ID,
  FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID,
} from './test_ids';

export interface HistoryProps {
  /**
   * A list of flyouts that have been opened
   */
  history: FlyoutPanelProps[];
  /**
   * Maximum number of flyouts to show in history
   */
  maxCount?: number;
}

/**
 * History of flyouts shown in top navigation
 * Shows the title of previously opened flyout, and count of history of more than 1 flyout was opened
 */
export const FlyoutHistory: FC<HistoryProps> = memo(({ history }) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const togglePopover = () => setPopover(!isPopoverOpen);

  const historyDropdownPanels = useMemo(
    () =>
      history.map((item, index) => {
        return <FlyoutHistoryRow item={item} index={index} />;
      }),
    [history]
  );

  if (history.length < 1) {
    return null;
  }

  return (
    <EuiFlexItem grow={false} data-test-subj={FLYOUT_HISTORY_TEST_ID}>
      <EuiPopover
        button={
          <EuiButtonEmpty
            onClick={togglePopover}
            size="m"
            iconType={'clockCounter'}
            data-test-subj={FLYOUT_HISTORY_BUTTON_TEST_ID}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          size="s"
          items={historyDropdownPanels}
          data-test-subj={FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID}
        />
      </EuiPopover>
    </EuiFlexItem>
  );
});

FlyoutHistory.displayName = 'FlyoutHistory';

/**
 * Helper function that reverses the history array,
 * removes duplicates and the most recent item
 * @returns a history array of maxCount length
 */
export const getProcessedHistory = ({
  history,
  maxCount,
}: {
  history: FlyoutPanelProps[];
  maxCount: number;
}): FlyoutPanelProps[] => {
  // Step 1: reverse history so the most recent is first
  const reversedHistory = history.slice().reverse();

  // Step 2: remove duplicates
  const historyArray = Array.from(new Set(reversedHistory.map((i) => JSON.stringify(i)))).map((i) =>
    JSON.parse(i)
  );

  // Omit the first (current) entry and return array of maxCount length
  return historyArray.slice(1, maxCount + 1);
};
