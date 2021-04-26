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

export function FieldValueSuggestions({
  fullWidth,
  sourceField,
  label,
  indexPattern,
  value,
  filters,
  button,
  time,
  width,
  forceOpen,
  anchorPosition,
  singleSelection,
  onChange: onSelectionChange,
}: FieldValueSuggestionsProps) {
  const [query, setQuery] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const { values, loading } = useValuesList({ indexPattern, query, sourceField, filters, time });

  useDebounce(
    () => {
      setQuery(debouncedValue);
    },
    400,
    [debouncedValue]
  );

  return (
    <FieldValueSelection
      fullWidth={fullWidth}
      singleSelection={singleSelection}
      values={values as string[]}
      label={label}
      onChange={onSelectionChange}
      setQuery={setDebouncedValue}
      loading={loading}
      value={value}
      button={button}
      forceOpen={forceOpen}
      anchorPosition={anchorPosition}
      width={width}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default FieldValueSuggestions;
