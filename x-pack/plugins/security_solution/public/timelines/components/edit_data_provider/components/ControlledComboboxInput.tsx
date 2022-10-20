/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { DataProviderType } from '../../timeline/data_providers/data_provider';
import { isStringOrNumberArray } from '../../timeline/helpers';
import { isValueFieldInvalid } from '../helpers';
import * as i18n from '../translations';

interface ControlledDataProviderInput {
  disableButtonCallback: (disableButton: boolean) => void;
  onChangeCallback: (value: string | number | string[]) => void;
  type: DataProviderType;
  value: string | number | Array<string | number>;
}

export const ControlledComboboxInput = ({
  value,
  onChangeCallback,
  type,
  disableButtonCallback,
}: ControlledDataProviderInput) => {
  const [includeValues, setIncludeValues] = useState(convertValuesToComboboxValueArray(value));

  const isInvalid = useMemo(
    () => includeValues.every((item) => isValueFieldInvalid(type, item.label)),
    [type, includeValues]
  );

  useEffect(() => {
    onChangeCallback(convertComboboxValuesToStringArray(includeValues));
    disableButtonCallback(isInvalid);
  }, [includeValues, isInvalid, onChangeCallback, disableButtonCallback]);

  const onCreateOption = (searchValue: string, flattenedOptions = includeValues) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    if (
      flattenedOptions.findIndex(
        (option) => option.label.trim().toLowerCase() === normalizedSearchValue
      ) === -1
    ) {
      setIncludeValues([
        ...includeValues,
        {
          label: searchValue,
        },
      ]);
    }
  };

  const onIncludeValueChanged = useCallback((updatedIncludesValues: EuiComboBoxOptionOption[]) => {
    setIncludeValues(updatedIncludesValues);
  }, []);

  return (
    <EuiComboBox
      noSuggestions
      isClearable={true}
      data-test-subj="operator"
      selectedOptions={includeValues}
      placeholder={i18n.ENTER_ONE_OR_MORE_VALUES}
      onCreateOption={onCreateOption}
      onChange={onIncludeValueChanged}
    />
  );
};

export const convertValuesToComboboxValueArray = (
  values: string | number | Array<string | number>
): EuiComboBoxOptionOption[] => {
  if (isStringOrNumberArray(values)) {
    return values.map((item) => ({ label: String(item) }));
  } else return [];
};

export const convertComboboxValuesToStringArray = (values: EuiComboBoxOptionOption[]): string[] => {
  return values.map((item) => item.label);
};
