/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiBadgeGroup, EuiBadge, EuiPopoverTitle } from '@elastic/eui';
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

const ExceptionOverflowWrapper = styled.div`
  width: 100%;
  overflow: hidden;
`;

const DisplayOverflowWrapper = styled.div`
  width: calc(100% - 75px);
  display: inline-block;
  vertical-align: middle;
`;

const ExceptionOverflowPopoverWrapper = styled(EuiBadgeGroup)`
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
  numberOfItemsToDisplay = 1,
  dataTestEntity = 'items',
}: PopoverItemsProps<T>) => {
  const [isExceptionOverflowPopoverOpen, setIsExceptionOverflowPopoverOpen] = useState(false);

  const OverflowList = ({ items: itemsToRender }: OverflowListProps<T>) => (
    <>{itemsToRender.map(renderItem)}</>
  );

  if (items.length <= numberOfItemsToDisplay) {
    return (
      <ExceptionOverflowWrapper data-test-subj={dataTestEntity} className="eui-textNoWrap">
        <OverflowList items={items} />
      </ExceptionOverflowWrapper>
    );
  }

  return (
    <ExceptionOverflowWrapper data-test-subj={dataTestEntity}>
      <DisplayOverflowWrapper>
        <OverflowList items={items.slice(0, numberOfItemsToDisplay)} />
      </DisplayOverflowWrapper>
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
        <ExceptionOverflowPopoverWrapper>
          <OverflowList items={items} />
        </ExceptionOverflowPopoverWrapper>
      </EuiPopover>
    </ExceptionOverflowWrapper>
  );
};

export const PopoverItems = React.memo(PopoverItemsComponent);

PopoverItems.displayName = 'PopoverItems';
