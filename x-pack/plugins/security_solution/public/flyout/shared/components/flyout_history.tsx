/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useState } from 'react';
import {
  EuiFlexItem,
  useEuiTheme,
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { FlyoutHistoryProps } from '@kbn/expandable-flyout';

export interface HistoryProps {
  /**
   * A list of flyouts that have been opened
   */
  history: FlyoutHistoryProps[];
}

/**
 * History of flyouts shown in top navigation
 * Shows the title of previously opened flyout, and count of history of more than 1 flyout was opened
 */
export const FlyoutHistory: FC<HistoryProps> = memo(({ history }) => {
  const { openFlyout, goBack } = useExpandableFlyoutApi();
  const { euiTheme } = useEuiTheme();
  const goBackAction = useCallback(() => goBack(), [goBack]);

  const [isPopoverOpen, setPopover] = useState(false);
  const togglePopover = () => setPopover(!isPopoverOpen);

  const historyDropdownPanels = (items: FlyoutHistoryProps[]) =>
    items.map((item, index) => {
      return (
        <EuiContextMenuItem
          key={index}
          onClick={() => openFlyout({ right: item.right, left: item.left, preview: item.preview })}
        >
          {item.right?.params?.title ?? 'Document details'}
        </EuiContextMenuItem>
      );
    });

  if (history.length < 2) {
    return null;
  }

  const previousFlyout = history[history.length - 2];
  let historyMenuArray: FlyoutHistoryProps[] = [];
  if (history.length > 2) {
    historyMenuArray = history.slice(0, -2).reverse();
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty iconSide="left" onClick={goBackAction} iconType="arrowLeft" size="s">
          {previousFlyout.right?.params?.title ?? 'Document details'}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {history.length > 2 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonEmpty
                onClick={togglePopover}
                size="xs"
                css={css`
                  border: 1px ${euiTheme.colors.lightShade} solid;
                  border-radius: 5px;
                `}
              >
                {`+${history.length - 2}`}
              </EuiButtonEmpty>
            }
            isOpen={isPopoverOpen}
            closePopover={togglePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s" items={historyDropdownPanels(historyMenuArray)} />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </>
  );
});

FlyoutHistory.displayName = 'FlyoutHistory';
