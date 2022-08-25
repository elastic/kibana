/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { EuiPopover, EuiFilterButton, useGeneratedHtmlId } from '@elastic/eui';
import { FILTER_NAMES } from '../translations';
import type { FilterName } from './hooks';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const ActionsLogFilterPopover = memo(
  ({
    children,
    filterName,
    hasActiveFilters,
    numActiveFilters,
    numFilters,
  }: {
    children: React.ReactNode;
    filterName: FilterName;
    hasActiveFilters: boolean;
    numActiveFilters: number;
    numFilters: number;
  }) => {
    const getTestId = useTestIdGenerator('response-actions-list');
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
          data-test-subj={getTestId(`${filterName}-filter-popoverButton`)}
          iconType="arrowDown"
          onClick={onButtonClick}
          isSelected={isPopoverOpen}
          numFilters={numFilters}
          hasActiveFilters={hasActiveFilters}
          numActiveFilters={numActiveFilters}
        >
          {FILTER_NAMES[filterName]}
        </EuiFilterButton>
      ),
      [
        filterName,
        getTestId,
        hasActiveFilters,
        isPopoverOpen,
        numActiveFilters,
        numFilters,
        onButtonClick,
      ]
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

ActionsLogFilterPopover.displayName = 'ActionsLogFilterPopover';
