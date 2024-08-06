/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { EuiIcon } from '@elastic/eui';
import ColumnHeaderTruncateContainer from '@kbn/unified-data-table/src/components/column_header_truncate_container';

import { EuiPopover, EuiPopoverTitle } from '@elastic/eui';

export const TooltipButton = ({
  children,
  popoverTitle,
  displayText,
  headerRowHeight,
  iconType = 'questionInCircle',
}: {
  children: React.ReactChild;
  popoverTitle: string;
  displayText?: string;
  headerRowHeight?: number;
  iconType?: string;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useMemo(
    () => () => {
      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
      }
    },
    []
  );

  const onMouseEnter = useCallback(() => {
    clearTimer();
    setIsPopoverOpen(true);
  }, [clearTimer]);

  const onMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setIsPopoverOpen(false), 100);
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return (
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {displayText}{' '}
      <EuiPopover
        button={
          <EuiIcon
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onMouseEnter}
            onBlur={onMouseLeave}
            type={iconType}
            tabIndex={0}
          />
        }
        isOpen={isPopoverOpen}
        anchorPosition="upCenter"
        panelPaddingSize="s"
        ownFocus={false}
      >
        <EuiPopoverTitle>{popoverTitle}</EuiPopoverTitle>
        {children}
      </EuiPopover>
    </ColumnHeaderTruncateContainer>
  );
};
