/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useValuesList } from '../../../hooks/use_values_list';
import { FieldValueSelection } from './field_value_selection';
import { FieldValueSuggestionsProps } from './types';
import { FieldValueCombobox } from './field_value_combobox';

export function FieldValueSuggestions({
  fullWidth,
  sourceField,
  label,
  dataViewTitle,
  selectedValue,
  excludedValue,
  filters,
  button,
  time,
  width,
  forceOpen,
  setForceOpen,
  anchorPosition,
  singleSelection,
  compressed,
  asFilterButton,
  usePrependLabel,
  allowAllValuesSelection,
  required,
  allowExclusions = true,
  cardinalityField,
  inspector,
  asCombobox = true,
  keepHistory = true,
  onChange: onSelectionChange,
}: FieldValueSuggestionsProps) {
  const [query, setQuery] = useState('');

  const { values, loading } = useValuesList({
    dataViewTitle,
    query,
    sourceField,
    filters,
    time,
    inspector,
    cardinalityField,
    keepHistory,
    label,
  });

  const SelectionComponent = asCombobox ? FieldValueCombobox : FieldValueSelection;

  return (
    <SelectionComponent
      fullWidth={fullWidth}
      singleSelection={singleSelection}
      values={values}
      label={label}
      onChange={onSelectionChange}
      query={query}
      setQuery={setQuery}
      loading={loading}
      selectedValue={selectedValue}
      excludedValue={excludedValue}
      button={button}
      forceOpen={forceOpen}
      setForceOpen={setForceOpen}
      anchorPosition={anchorPosition}
      width={width}
      compressed={compressed}
      asFilterButton={asFilterButton}
      usePrependLabel={usePrependLabel}
      allowExclusions={allowExclusions}
      allowAllValuesSelection={singleSelection ? false : allowAllValuesSelection}
      required={required}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default FieldValueSuggestions;
