/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValuesList } from '../../../hooks/use_values_list';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { FieldValueSelection } from './field_value_selection';

interface Props {
  value?: string;
  label: string;
  indexPattern: IIndexPattern;
  sourceField: string;
  onChange: (val: string) => void;
}

export function FieldValueSuggestions({
  sourceField,
  label,
  indexPattern,
  value,
  onChange: onSelectionChange,
}: Props) {
  const [query, setQuery] = useState('');
  const { values, loading } = useValuesList({ indexPattern, query, sourceField });

  return (
    <FieldValueSelection
      values={values}
      label={label}
      onChange={onSelectionChange}
      setQuery={setQuery}
      loading={loading}
      value={value}
    />
  );
}
