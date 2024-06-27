/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { FilterOptions, TaskTypes } from '../types';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter, mapToMultiSelectOption } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  optionKeys: TaskTypes[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
}

const options = mapToMultiSelectOption(Object.values(TaskTypes));

export const TaskTypeFilter: React.FC<Props> = ({ optionKeys, onChange }) => {
  const onSystemFilterChange = ({
    filterId,
    selectedOptionKeys,
  }: {
    filterId: string;
    selectedOptionKeys: Array<string | null>;
  }) => {
    onChange({
      [filterId]: selectedOptionKeys,
    });
  };
  const renderOption = (option: MultiSelectFilterOption) => {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={false}>{option.label}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <MultiSelectFilter
      buttonLabel={i18n.TASK_TYPE}
      id={'type'}
      onChange={onSystemFilterChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={optionKeys}
    />
  );
};
