/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiButtonColor } from '@elastic/eui';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectStatusFilter, setStatusFilter } from '../../../state';

export interface FilterStatusButtonProps {
  content: string | JSX.Element;
  dataTestSubj: string;
  isDisabled?: boolean;
  value?: 'up' | 'down';
  withNext: boolean;
}

export const FilterStatusButton = ({
  content,
  dataTestSubj,
  isDisabled,
  value,
  withNext,
}: FilterStatusButtonProps) => {
  const statusFilter = useSelector(selectStatusFilter);
  const dispatch = useDispatch();

  const isActive = statusFilter === value;
  let color: EuiButtonColor = 'text';
  if (isActive) {
    color = value === 'up' ? 'success' : value === 'down' ? 'danger' : 'text';
  }
  return (
    <EuiFilterButton
      data-test-subj={dataTestSubj}
      hasActiveFilters={isActive}
      isDisabled={isDisabled}
      onClick={() => {
        dispatch(setStatusFilter(statusFilter === value ? undefined : value));
      }}
      withNext={withNext}
      color={color}
    >
      {content}
    </EuiFilterButton>
  );
};
