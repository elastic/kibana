/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { EuiPopover, EuiFilterButton, useGeneratedHtmlId } from '@elastic/eui';

export const ActionListFilterPopover = memo(
  ({
    children,
    filterName,
    hasActiveFilters,
    numActiveFilters,
    numFilters,
  }: {
    children: React.ReactNode;
    filterName: string;
    hasActiveFilters: boolean;
    numActiveFilters: number;
    numFilters: number;
  }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const onButtonClick = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [setIsPopoverOpen, isPopoverOpen]);
    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);
    const filterGroupPopoverId = useGeneratedHtmlId({
      prefix: 'filterGroupPopover',
    });

    const button = useMemo(
      () => (
        <EuiFilterButton
          iconType="arrowDown"
          onClick={onButtonClick}
          isSelected={isPopoverOpen}
          numFilters={numFilters}
          hasActiveFilters={hasActiveFilters}
          numActiveFilters={numActiveFilters}
        >
          {filterName}
        </EuiFilterButton>
      ),
      [filterName, hasActiveFilters, isPopoverOpen, numActiveFilters, numFilters, onButtonClick]
    );

    return (
      <EuiPopover
        button={button}
        closePopover={closePopover}
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        {children}
      </EuiPopover>
    );
  }
);

ActionListFilterPopover.displayName = 'ActionListFilterPopover';
