/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useDebounce } from 'react-use';
import { useValuesList } from '../../../hooks/use_values_list';
import { FieldValueSelection } from './field_value_selection';
import { FieldValueSuggestionsProps } from './types';
import { FieldValueCombobox } from './field_value_combobox';

export function FieldValueSuggestions({
  fullWidth,
  sourceField,
  label,
  indexPattern,
  selectedValue,
  filters,
  button,
  time,
  width,
  forceOpen,
  anchorPosition,
  singleSelection,
  asCombobox = true,
  onChange: onSelectionChange,
}: FieldValueSuggestionsProps) {
  const [query, setQuery] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const { values, loading } = useValuesList({
    indexPattern,
    query,
    sourceField,
    filters,
    time,
    keepHistory: true,
  });

  useDebounce(
    () => {
      setQuery(debouncedValue);
    },
    400,
    [debouncedValue]
  );

  const SelectionComponent = asCombobox ? FieldValueCombobox : FieldValueSelection;

  return (
    <SelectionComponent
      fullWidth={fullWidth}
      singleSelection={singleSelection}
      values={values as string[]}
      label={label}
      onChange={onSelectionChange}
      setQuery={setDebouncedValue}
      loading={loading}
      selectedValue={selectedValue}
      button={button}
      forceOpen={forceOpen}
      anchorPosition={anchorPosition}
      width={width}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default FieldValueSuggestions;
