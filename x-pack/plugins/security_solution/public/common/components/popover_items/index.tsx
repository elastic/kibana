/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiBadgeGroup,
  EuiBadge,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import styled from 'styled-components';

export interface PopoverItemsProps<T> {
  renderItem: (item: T, index: number, items: T[]) => React.ReactNode;
  items: T[];
  popoverButtonTitle: string;
  popoverButtonIcon?: string;
  popoverTitle?: string;
  numberOfItemsToDisplay?: number;
  dataTestEntity?: string;
}

interface OverflowListProps<T> {
  readonly items: T[];
}

const PopoverItemsWrapper = styled(EuiFlexGroup)`
  width: 100%;
`;

const PopoverWrapper = styled(EuiBadgeGroup)`
  max-height: 200px;
  max-width: 600px;
  overflow: auto;
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
`;

/**
 * @param items to display
 */
const PopoverItemsComponent = <T extends unknown>({
  items,
  renderItem,
  popoverTitle,
  popoverButtonTitle,
  popoverButtonIcon,
  numberOfItemsToDisplay = 0,
  dataTestEntity = 'items',
}: PopoverItemsProps<T>) => {
  const [isExceptionOverflowPopoverOpen, setIsExceptionOverflowPopoverOpen] = useState(false);

  const OverflowList = ({ items: itemsToRender }: OverflowListProps<T>) => (
    <>{itemsToRender.map(renderItem)}</>
  );

  if (items.length <= numberOfItemsToDisplay) {
    return (
      <PopoverItemsWrapper data-test-subj={dataTestEntity} gutterSize="none">
        <OverflowList items={items} />
      </PopoverItemsWrapper>
    );
  }

  return (
    <PopoverItemsWrapper alignItems="center" gutterSize="s" data-test-subj={dataTestEntity}>
      <EuiFlexItem grow={1} className="eui-textTruncate">
        <OverflowList items={items.slice(0, numberOfItemsToDisplay)} />
      </EuiFlexItem>
      <EuiPopover
        ownFocus
        data-test-subj={`${dataTestEntity}-display-popover`}
        button={
          <EuiBadge
            iconType={popoverButtonIcon}
            color="hollow"
            data-test-subj={`${dataTestEntity}-display-popover-button`}
            onClick={() => setIsExceptionOverflowPopoverOpen(!isExceptionOverflowPopoverOpen)}
            onClickAriaLabel={popoverButtonTitle}
          >
            {popoverButtonTitle}
          </EuiBadge>
        }
        isOpen={isExceptionOverflowPopoverOpen}
        closePopover={() => setIsExceptionOverflowPopoverOpen(!isExceptionOverflowPopoverOpen)}
        repositionOnScroll
      >
        {popoverTitle ? (
          <EuiPopoverTitle data-test-subj={`${dataTestEntity}-display-popover-title`}>
            {popoverTitle}
          </EuiPopoverTitle>
        ) : null}
        <PopoverWrapper data-test-subj={`${dataTestEntity}-display-popover-wrapper`}>
          <OverflowList items={items} />
        </PopoverWrapper>
      </EuiPopover>
    </PopoverItemsWrapper>
  );
};

export const PopoverItems = React.memo(PopoverItemsComponent);

PopoverItems.displayName = 'PopoverItems';
