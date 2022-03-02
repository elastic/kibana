/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { debounce } from 'lodash';
import React, { useCallback, useState } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';

interface SuggestionsSelecttWithTermProps {
  allOption?: EuiComboBoxOptionOption<string>;
  customOptionText?: string;
  defaultValue?: string;
  field: string;
  termField: string;
  termValue: string;
  start?: string;
  end?: string;
  onChange: (value?: string) => void;
  placeholder: string;
  prepend?: string;
}

export function SuggestionsSelectWithTerm({
  allOption,
  customOptionText,
  defaultValue,
  field,
  termField,
  termValue,
  start,
  end,
  onChange,
  placeholder,
  prepend,
}: SuggestionsSelecttWithTermProps) {
  const allowAll = !!allOption;
  let defaultOption: EuiComboBoxOptionOption<string> | undefined;

  if (allowAll && !defaultValue) {
    defaultOption = allOption;
  }
  if (defaultValue) {
    defaultOption = { label: defaultValue, value: defaultValue };
  }
  const [selectedOptions, setSelectedOptions] = useState(
    defaultOption ? [defaultOption] : []
  );

  const [searchValue, setSearchValue] = useState('');

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/suggestions_with_terms', {
        params: {
          query: {
            field,
            string: searchValue,
            start,
            end,
            termField,
            termValue,
          },
        },
      });
    },
    [field, searchValue],
    { preservePreviousData: false }
  );

  const handleChange = useCallback(
    (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedOptions(changedOptions);
      if (changedOptions.length === 1) {
        onChange(
          changedOptions[0].value
            ? changedOptions[0].value.trim()
            : changedOptions[0].value
        );
      }
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (value: string) => {
      handleChange([{ label: value, value }]);
    },
    [handleChange]
  );

  const terms = data?.terms ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...(allOption &&
    (searchValue === '' ||
      searchValue.toLowerCase() === allOption.label.toLowerCase())
      ? [allOption]
      : []),
    ...terms.map((name) => {
      return { label: name, value: name };
    }),
  ];

  return (
    <EuiComboBox
      async={true}
      compressed={true}
      customOptionText={customOptionText}
      isLoading={status === FETCH_STATUS.LOADING}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
      onSearchChange={debounce(setSearchValue, 500)}
      options={options}
      placeholder={placeholder}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
      style={{ minWidth: '256px' }}
      prepend={prepend}
    />
  );
}
