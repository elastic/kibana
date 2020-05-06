/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton } from '@elastic/eui';
import React from 'react';
import { useUrlParams } from '../../../hooks';

export interface FilterStatusButtonProps {
  content: string | JSX.Element;
  dataTestSubj: string;
  isDisabled?: boolean;
  isActive: boolean;
  value: 'up' | 'down' | '';
  withNext: boolean;
  color?: string;
}

export const FilterStatusButton = ({
  content,
  dataTestSubj,
  isDisabled,
  isActive,
  value,
  color,
  withNext,
}: FilterStatusButtonProps) => {
  const [getUrlParams, setUrlParams] = useUrlParams();
  const { statusFilter: urlValue } = getUrlParams();
  return (
    <EuiFilterButton
      color={(isActive ? color : undefined) as any}
      data-test-subj={dataTestSubj}
      hasActiveFilters={isActive}
      isDisabled={isDisabled}
      onClick={() => {
        const nextFilter = { statusFilter: urlValue === value ? '' : value, pagination: '' };
        setUrlParams(nextFilter);
      }}
      withNext={withNext}
    >
      {content}
    </EuiFilterButton>
  );
};
