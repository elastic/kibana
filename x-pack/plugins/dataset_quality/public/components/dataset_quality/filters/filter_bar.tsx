/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const SINGLE_SELECTION = { asPlainText: true };

const placeholder = i18n.translate('xpack.datasetQuality.filterBar.placeholder', {
  defaultMessage: 'Filter datasets',
});

const customOptionText = i18n.translate('xpack.datasetQuality.filterBar.customOptionText', {
  defaultMessage: 'Add \\{searchValue\\} as your filter',
});

export interface FilterBarComponentProps {
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
  query?: string;
  onQueryChange: (query: string) => void;
  onSearchChange: (serachVal: string) => void;
}

export const FilterBar = ({
  isLoading,
  options,
  query,
  onSearchChange,
  onQueryChange,
}: FilterBarComponentProps) => {
  const onChange = useCallback(
    (selectedOptions) => {
      onQueryChange(selectedOptions?.[0]?.label);
    },
    [onQueryChange]
  );

  const onCreateOption = useCallback(
    (searchValue) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      onQueryChange(searchValue);
    },
    [onQueryChange]
  );

  return (
    <EuiComboBox
      fullWidth
      aria-label={placeholder}
      placeholder={placeholder}
      singleSelection={SINGLE_SELECTION}
      options={options}
      isLoading={isLoading}
      onSearchChange={onSearchChange}
      selectedOptions={query ? options.filter((option) => option.label === query) : []}
      onChange={onChange}
      onCreateOption={onCreateOption}
      customOptionText={customOptionText}
      isClearable
    />
  );
};
