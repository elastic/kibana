/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { uniq, debounce } from 'lodash';
import {
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption
} from '@elastic/eui';
import { getMatchingIndices } from '../../../../services/api';
import type { FieldHook } from '../../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../../shared_imports';

interface IOption {
  label: string;
  options: Array<{ value: string; label: string; key?: string }>;
}

interface Props {
  field: FieldHook;
  [key: string]: any;
}


const getIndexOptions = async (patternString: string) => {
  const options: IOption[] = [];

  if (!patternString) {
    return options;
  }

  const { data } = (await getMatchingIndices(patternString));
  const matchingIndices = data.indices;

  if (matchingIndices.length) {
    const matchingOptions = uniq([...matchingIndices]);

    options.push({
      label: 'Based on your indices',
      options: matchingOptions
        .map((match) => {
          return {
            label: match,
            value: match,
          };
        })
        .sort((a, b) => String(a.label).localeCompare(b.label)),
    });
  }

  return options;
};


export const IndicesSelector = ({
  field,
  ...rest
}: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  const onSearchChange = useCallback(debounce(async (search: string) => {
    setIsIndiciesLoading(true);
    setIndexOptions(await getIndexOptions(search));
    setIsIndiciesLoading(false);
  }, 400), [setIsIndiciesLoading, setIndexOptions]);

  return (
    <EuiFormRow
      label={field.label}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      {...rest}
    >
      <EuiComboBox
        async
        isLoading={isIndiciesLoading}
        noSuggestions={!indexOptions.length}
        options={indexOptions}
        selectedOptions={(field.value || []).map((anIndex: string) => {
          return {
            label: anIndex,
            value: anIndex,
          };
        })}
        onChange={async (selected: EuiComboBoxOptionOption[]) => {
          field.setValue(
            selected.map((aSelected) => aSelected.value) as string[]
          );
        }}
        onSearchChange={onSearchChange}
        onBlur={() => {
          if (field.value.length === 0) {
            field.setValue([]);
          }
        }}
      />
    </EuiFormRow>
  );
};
