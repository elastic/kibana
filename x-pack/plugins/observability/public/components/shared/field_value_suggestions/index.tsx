/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useDebounce } from 'react-use';
import { useValuesList } from '../../../hooks/use_values_list';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { FieldValueSelection } from './field_value_selection';

export interface FieldValueSuggestionsProps {
  value?: string;
  label: string;
  indexPattern: IIndexPattern;
  sourceField: string;
  onChange: (val?: string) => void;
}

export function FieldValueSuggestions({
  sourceField,
  label,
  indexPattern,
  value,
  onChange: onSelectionChange,
}: FieldValueSuggestionsProps) {
  const [query, setQuery] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const { values, loading } = useValuesList({ indexPattern, query, sourceField });

  useDebounce(
    () => {
      setQuery(debouncedValue);
    },
    400,
    [debouncedValue]
  );

  return (
    <FieldValueSelection
      values={values as string[]}
      label={label}
      onChange={onSelectionChange}
      setQuery={setDebouncedValue}
      loading={loading}
      value={value}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default FieldValueSuggestions;
