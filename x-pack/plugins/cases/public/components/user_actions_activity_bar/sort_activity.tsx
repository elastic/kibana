/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiComboBox } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';

import * as i18n from './translations';
import type { SortOrderType } from './types';

interface FilterActivityProps {
  sortOrder: SortOrderType;
  onOrderChange: (sortOrder: SortOrderType) => void;
}

export const SortActivity = React.memo<FilterActivityProps>(({ sortOrder, onOrderChange }) => {
  const [selectedOption, setSelectedOption] = useState<EuiComboBoxOptionOption[]>([
    { id: sortOrder, label: sortOrder === 'asc' ? 'Oldest First' : 'Newest First' },
  ]);

  const options: EuiComboBoxOptionOption[] = [
    {
      id: 'desc',
      label: i18n.NEWEST,
    },
    {
      id: 'asc',
      label: i18n.OLDEST,
    },
  ];

  const onComboBoxChange = useCallback(
    (currentOption) => {
      setSelectedOption(currentOption);
      onOrderChange(currentOption[0].id);
    },
    [setSelectedOption, onOrderChange]
  );

  return (
    <EuiComboBox
      prepend="SortBy"
      placeholder="Oldest First"
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOption}
      onChange={onComboBoxChange}
    />
  );
});

SortActivity.displayName = 'SortActivity';
