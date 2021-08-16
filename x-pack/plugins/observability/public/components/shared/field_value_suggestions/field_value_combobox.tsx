/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { union } from 'lodash';
import { EuiComboBox, EuiFormControlLayout, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { FieldValueSelectionProps } from './types';
export const ALL_VALUES_SELECTED = 'ALL_VALUES';
const formatOptions = (values?: string[], allowAllValuesSelection?: boolean) => {
  const uniqueValues = Array.from(
    new Set(allowAllValuesSelection ? ['ALL_VALUES', ...(values ?? [])] : values)
  );

  return (uniqueValues ?? []).map((label) => ({
    label,
  }));
};

type ValueOption = EuiComboBoxOptionOption<string>;

export function FieldValueCombobox({
  label,
  selectedValue,
  loading,
  values,
  setQuery,
  compressed = true,
  allowAllValuesSelection,
  onChange: onSelectionChange,
}: FieldValueSelectionProps) {
  const [options, setOptions] = useState<ValueOption[]>(() =>
    formatOptions(
      union(values?.map(({ label: lb }) => lb) ?? [], selectedValue ?? []),
      allowAllValuesSelection
    )
  );

  useEffect(() => {
    setOptions(
      formatOptions(
        union(values?.map(({ label: lb }) => lb) ?? [], selectedValue ?? []),
        allowAllValuesSelection
      )
    );
  }, [allowAllValuesSelection, selectedValue, values]);

  const onChange = (selectedValuesN: ValueOption[]) => {
    onSelectionChange(selectedValuesN.map(({ label: lbl }) => lbl));
  };

  return (
    <ComboWrapper>
      <EuiFormControlLayout fullWidth prepend={label} compressed>
        <EuiComboBox
          fullWidth
          compressed={compressed}
          placeholder={i18n.translate(
            'xpack.observability.fieldValueSelection.placeholder.search',
            {
              defaultMessage: 'Search {label}',
              values: { label },
            }
          )}
          isLoading={loading}
          onSearchChange={(searchVal) => {
            setQuery(searchVal);
          }}
          options={options}
          selectedOptions={options.filter((opt) => selectedValue?.includes(opt.label))}
          onChange={onChange}
        />
      </EuiFormControlLayout>
    </ComboWrapper>
  );
}

const ComboWrapper = styled.div`
  &&& {
    .euiFormControlLayout {
      height: auto;
      .euiFormControlLayout__prepend {
        margin: auto;
      }
      .euiComboBoxPill {
        max-width: 250px;
      }
      .euiComboBox__inputWrap {
        border-radius: 0;
      }
    }
  }
`;
