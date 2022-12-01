/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';

import { isStringOrNumberArray } from '../../timeline/helpers';
import * as i18n from '../translations';

interface ControlledDataProviderInput {
  onChangeCallback: (value: string | number | string[]) => void;
  value: string | number | Array<string | number>;
}

export const ControlledComboboxInput = ({
  value,
  onChangeCallback,
}: ControlledDataProviderInput) => {
  const [includeValues, setIncludeValues] = useState(convertValuesToComboboxValueArray(value));

  useEffect(() => {
    onChangeCallback(convertComboboxValuesToStringArray(includeValues));
  }, [includeValues, onChangeCallback]);

  const onCreateOption = useCallback(
    (searchValue: string, flattenedOptions: EuiComboBoxOptionOption[] = includeValues) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      if (
        flattenedOptions.findIndex(
          (option) => option.label.trim().toLowerCase() === normalizedSearchValue
        ) === -1
        // add the option, because it wasn't found in the current set of `includeValues`
      ) {
        setIncludeValues([
          ...includeValues,
          {
            label: searchValue,
          },
        ]);
      }
    },
    [includeValues]
  );

  const onIncludeValueChanged = useCallback((updatedIncludesValues: EuiComboBoxOptionOption[]) => {
    setIncludeValues(updatedIncludesValues);
  }, []);

  return (
    <EuiComboBox
      noSuggestions
      isClearable={true}
      data-test-subj="is-one-of-combobox-input"
      selectedOptions={includeValues}
      placeholder={i18n.ENTER_ONE_OR_MORE_VALUES}
      onCreateOption={onCreateOption}
      onChange={onIncludeValueChanged}
    />
  );
};

export const convertValuesToComboboxValueArray = (
  values: string | number | Array<string | number>
): EuiComboBoxOptionOption[] =>
  isStringOrNumberArray(values) ? values.map((item) => ({ label: String(item) })) : [];

export const convertComboboxValuesToStringArray = (values: EuiComboBoxOptionOption[]): string[] =>
  values.map((item) => item.label);
