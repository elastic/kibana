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

const formatOptions = (values?: string[]) => {
  const uniqueValues = Array.from(new Set(values));

  return (uniqueValues ?? []).map((val) => ({
    label: val,
  }));
};

type ValueOption = EuiComboBoxOptionOption<string>;

export function FieldValueCombobox({
  label,
  selectedValue,
  loading,
  values,
  setQuery,
  onChange: onSelectionChange,
}: FieldValueSelectionProps) {
  const [options, setOptions] = useState<ValueOption[]>(
    formatOptions(union(values ?? [], selectedValue ?? []))
  );

  useEffect(() => {
    setOptions(formatOptions(union(values ?? [], selectedValue ?? [])));
  }, [selectedValue, values]);

  const onChange = (selectedValuesN: ValueOption[]) => {
    onSelectionChange(selectedValuesN.map(({ label: lbl }) => lbl));
  };

  return (
    <ComboWrapper>
      <EuiFormControlLayout fullWidth prepend={label} compressed>
        <EuiComboBox
          fullWidth
          compressed
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
