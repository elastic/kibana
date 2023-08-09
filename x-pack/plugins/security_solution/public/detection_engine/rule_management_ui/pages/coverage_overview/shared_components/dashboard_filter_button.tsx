/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiPopover, EuiFilterButton, EuiSelectable, EuiFilterGroup } from '@elastic/eui';
import { css } from '@emotion/css';
import { coverageOverviewFilterWidth } from '../constants';

export interface DashboardFilterButtonComponentProps {
  options: EuiSelectableOption[];
  title: string;
  onChange: (options: EuiSelectableOption[]) => void;
  isLoading: boolean;
}

export const DashboardFilterButtonComponent = ({
  options,
  title,
  onChange,
  isLoading,
}: DashboardFilterButtonComponentProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const hasActiveFilters = useMemo(() => !!options.find((option) => option.checked), [options]);
  const numActiveFilters = useMemo(
    () => options.filter((option) => option.checked === 'on').length,
    [options]
  );

  const handleSelectableOnChange = useCallback(
    (newOptions: EuiSelectableOption[], event, changedOption: EuiSelectableOption) => {
      onChange(newOptions);
    },
    [onChange]
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        isLoading={isLoading}
        iconType="arrowDown"
        onClick={onButtonClick}
        isSelected={isPopoverOpen}
        numFilters={options.length}
        hasActiveFilters={hasActiveFilters}
        numActiveFilters={numActiveFilters}
      >
        {title}
      </EuiFilterButton>
    ),
    [
      hasActiveFilters,
      isPopoverOpen,
      numActiveFilters,
      onButtonClick,
      options.length,
      title,
      isLoading,
    ]
  );
  return (
    <EuiFilterGroup
      css={css`
        width: ${coverageOverviewFilterWidth}px;
      `}
    >
      <EuiPopover
        id={`${title}_popover`}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiSelectable isLoading={isLoading} options={options} onChange={handleSelectableOnChange}>
          {(list) => (
            <div
              css={css`
                width: ${coverageOverviewFilterWidth}px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
