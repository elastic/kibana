/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface UptimeFilterButtonProps {
  isDisabled?: boolean;
  isSelected: boolean;
  numFilters: number;
  numActiveFilters: number;
  onClick: () => void;
  title: string;
}

export const UptimeFilterButton = ({
  isDisabled,
  isSelected,
  numFilters,
  numActiveFilters,
  onClick,
  title,
}: UptimeFilterButtonProps) => (
  <EuiFilterButton
    aria-label={i18n.translate('xpack.uptime.overview.filterButton.label', {
      defaultMessage: 'expands filter group for {title} filter',
      values: { title },
    })}
    hasActiveFilters={numActiveFilters !== 0}
    iconType="arrowDown"
    isDisabled={isDisabled}
    isSelected={isSelected}
    numActiveFilters={numActiveFilters}
    numFilters={numFilters}
    onClick={onClick}
  >
    {title}
  </EuiFilterButton>
);
