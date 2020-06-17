/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton } from '@elastic/eui';
import React from 'react';

interface UptimeFilterButtonProps {
  isDisabled?: boolean;
  isSelected: boolean;
  numFilters: number;
  numActiveFilters: number;
  onClick: () => void;
  title: string;
  size?: string;
}

export const UptimeFilterButton = ({
  isDisabled,
  isSelected,
  numFilters,
  numActiveFilters,
  onClick,
  title,
  size = 'l',
}: UptimeFilterButtonProps) => (
  <EuiFilterButton
    hasActiveFilters={numActiveFilters !== 0}
    iconType="arrowDown"
    isDisabled={isDisabled}
    isSelected={isSelected}
    numActiveFilters={numActiveFilters}
    numFilters={numFilters}
    onClick={onClick}
    size={size as const}
  >
    {title}
  </EuiFilterButton>
);
