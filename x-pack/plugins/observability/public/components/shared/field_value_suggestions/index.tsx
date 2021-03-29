/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useDebounce } from 'react-use';
import { PopoverAnchorPosition } from '@elastic/eui/src/components/popover/popover';
import { useValuesList } from '../../../hooks/use_values_list';
import { IndexPattern } from '../../../../../../../src/plugins/data/common';
import { FieldValueSelection } from './field_value_selection';
import { ESFilter } from '../../../../../../../typings/elasticsearch';

export interface FieldValueSuggestionsProps {
  value?: string;
  label: string;
  indexPattern: IndexPattern;
  sourceField: string;
  onChange: (val?: string) => void;
  filters: ESFilter[];
  anchorPosition?: PopoverAnchorPosition;
  time?: { from: string; to: string };
  forceOpen?: boolean;
  button?: JSX.Element;
  width?: number;
}

export function FieldValueSuggestions({
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
