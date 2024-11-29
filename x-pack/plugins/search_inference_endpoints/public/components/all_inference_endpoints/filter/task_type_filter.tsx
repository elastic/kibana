/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TaskTypes } from '../../../../common/types';
import { FilterOptions } from '../types';
import { MultiSelectFilter, MultiSelectFilterOption } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  optionKeys: TaskTypes[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
}

const options = Object.values(TaskTypes).map((option) => ({
  key: option,
  label: option,
}));

export const TaskTypeFilter: React.FC<Props> = ({ optionKeys, onChange }) => {
  const filterId: string = 'type';
  const onSystemFilterChange = (newOptions: MultiSelectFilterOption[]) => {
    onChange({
      [filterId]: newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key),
    });
  };

  return (
    <MultiSelectFilter
      buttonLabel={i18n.TASK_TYPE}
      onChange={onSystemFilterChange}
      options={options}
      renderOption={(option) => option.label}
      selectedOptionKeys={optionKeys}
      dataTestSubj="type-field-endpoints"
    />
  );
};
