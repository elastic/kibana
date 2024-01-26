/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { uniq, isEmpty } from 'lodash';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import type { EuiComboBoxProps } from '@elastic/eui';
import { getMatchingIndices } from '../../../../services/api';
import type { FieldHook } from '../../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../../shared_imports';

interface IOption {
  label: string;
  options: Array<{ value: string; label: string; key?: string }>;
}

interface Props {
  field: FieldHook;
  euiFieldProps: EuiComboBoxProps<string>;
  [key: string]: any;
}

const getIndexOptions = async (patternString: string) => {
  const options: IOption[] = [];

  if (!patternString) {
    return options;
  }

  const { data } = await getMatchingIndices(patternString);
  const matchingIndices = data.indices;

  if (matchingIndices.length) {
    const matchingOptions = uniq([...matchingIndices]);

    options.push({
      label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.indicesSelector.optionsLabel', {
        defaultMessage: 'Based on your indices',
      }),
      options: matchingOptions
        .map((match) => {
          return {
            label: match,
            value: match,
          };
        })
        .sort((a, b) => String(a.label).localeCompare(b.label)),
    });
  } else {
    options.push({
      label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.indicesSelector.noMatchingOption', {
        defaultMessage: 'No indices match your search criteria.',
      }),
      options: [],
    });
  }

  return options;
};

export const IndicesSelector = ({ field, euiFieldProps, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  const onSearchChange = useCallback(
    async (search: string) => {
      const indexPattern = isEmpty(search) ? '*' : search;

      setIsIndiciesLoading(true);
      setIndexOptions(await getIndexOptions(indexPattern));
      setIsIndiciesLoading(false);
    },
    [setIsIndiciesLoading, setIndexOptions]
  );

  // Fetch indices on mount so that the ComboBox has some initial options
  useEffect(() => {
    if (isEmpty(field.value)) {
      onSearchChange('*');
    }
  }, [field.value, onSearchChange]);

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      {...rest}
    >
      <EuiComboBox
        async
        isLoading={isIndiciesLoading}
        options={indexOptions}
        noSuggestions={!indexOptions.length}
        selectedOptions={((field.value as string[]) || []).map((anIndex: string) => {
          return {
            label: anIndex,
            value: anIndex,
          };
        })}
        onChange={async (selected: EuiComboBoxOptionOption[]) => {
          field.setValue(selected.map((aSelected) => aSelected.value) as string[]);
        }}
        onSearchChange={onSearchChange}
        onBlur={() => {
          if (!field.value) {
            field.setValue([]);
          }
        }}
        data-test-subj="comboBox"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
