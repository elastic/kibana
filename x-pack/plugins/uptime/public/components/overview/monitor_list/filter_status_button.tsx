/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { uiSelector } from '../../../state/selectors';
import { setUiState } from '../../../state/actions';

export interface FilterStatusButtonProps {
  content: string | JSX.Element;
  dataTestSubj: string;
  isDisabled?: boolean;
  isActive: boolean;
  value: 'up' | 'down' | '';
  withNext: boolean;
  color?: string;
}

export const FilterStatusButton: React.FC<FilterStatusButtonProps> = (props) => {
  const dispatch = useDispatch();
  const setStatusFilterAndPagination = useCallback(
    (nextValue: string) => {
      dispatch(
        setUiState({
          statusFilter: nextValue,
          currentMonitorListPage: '',
        })
      );
    },
    [dispatch]
  );
  const { statusFilter } = useSelector(uiSelector);

  return (
    <FilterStatusButtonComponent
      {...props}
      setStatusFilterAndPagination={setStatusFilterAndPagination}
      statusFilter={statusFilter}
    />
  );
};

type Props = FilterStatusButtonProps & {
  statusFilter: string;
  setStatusFilterAndPagination: (nextValue: string) => void;
};

export const FilterStatusButtonComponent: React.FC<Props> = React.memo(
  ({
    content,
    dataTestSubj,
    isDisabled,
    isActive,
    value,
    color,
    setStatusFilterAndPagination: setStatusFilter,
    statusFilter: urlValue,
    withNext,
  }) => (
    <EuiFilterButton
      color={(isActive ? color : undefined) as any}
      data-test-subj={dataTestSubj}
      hasActiveFilters={isActive}
      isDisabled={isDisabled}
      onClick={() => setStatusFilter(urlValue === value ? '' : value)}
      withNext={withNext}
    >
      {content}
    </EuiFilterButton>
  )
);
