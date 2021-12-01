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
  dataTestPrefix?: string;
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
 * Component to render list of items in popover, wicth configurabe number of display items by default
 * @param items - array of items to render
 * @param renderItem - render function that render item, arguments: item, index, items[]
 * @param popoverTitle - title of popover
 * @param popoverButtonTitle - title of popover button that triggers popover
 * @param popoverButtonIcon - icon of popover button that triggers popover
 * @param numberOfItemsToDisplay - number of items to render that are no in popover, defaults to 0
 * @param dataTestPrefix - data-test-subj prefix to apply to elements
 */
const PopoverItemsComponent = <T extends unknown>({
  items,
  renderItem,
  popoverTitle,
  popoverButtonTitle,
  popoverButtonIcon,
  numberOfItemsToDisplay = 0,
  dataTestPrefix = 'items',
}: PopoverItemsProps<T>) => {
  const [isExceptionOverflowPopoverOpen, setIsExceptionOverflowPopoverOpen] = useState(false);

  const OverflowList = ({ items: itemsToRender }: OverflowListProps<T>) => (
    <>{itemsToRender.map(renderItem)}</>
  );

  if (items.length <= numberOfItemsToDisplay) {
    return (
      <PopoverItemsWrapper data-test-subj={dataTestPrefix} alignItems="center" gutterSize="s">
        <OverflowList items={items} />
      </PopoverItemsWrapper>
    );
  }

  return (
    <PopoverItemsWrapper alignItems="center" gutterSize="s" data-test-subj={dataTestPrefix}>
      <EuiFlexItem grow={1} className="eui-textTruncate">
        <OverflowList items={items.slice(0, numberOfItemsToDisplay)} />
      </EuiFlexItem>
      <EuiPopover
        ownFocus
        data-test-subj={`${dataTestPrefix}DisplayPopover`}
        button={
          <EuiBadge
            iconType={popoverButtonIcon}
            color="hollow"
            data-test-subj={`${dataTestPrefix}DisplayPopoverButton`}
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
          <EuiPopoverTitle data-test-subj={`${dataTestPrefix}DisplayPopoverTitle`}>
            {popoverTitle}
          </EuiPopoverTitle>
        ) : null}
        <PopoverWrapper data-test-subj={`${dataTestPrefix}DisplayPopoverWrapper`}>
          <OverflowList items={items.slice(numberOfItemsToDisplay)} />
        </PopoverWrapper>
      </EuiPopover>
    </PopoverItemsWrapper>
  );
};

const MemoizedPopoverItems = React.memo(PopoverItemsComponent);
MemoizedPopoverItems.displayName = 'PopoverItems';

export const PopoverItems = MemoizedPopoverItems as typeof PopoverItemsComponent;
