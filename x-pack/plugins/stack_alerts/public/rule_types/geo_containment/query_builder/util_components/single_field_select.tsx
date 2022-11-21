/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import { DataViewField } from '@kbn/data-views-plugin/public';

function fieldsToOptions(fields?: DataViewField[]): Array<EuiComboBoxOptionOption<DataViewField>> {
  if (!fields) {
    return [];
  }

  return fields
    .map((field) => ({
      value: field,
      label: field.name,
    }))
    .sort((a, b) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });
}

interface Props {
  placeholder: string;
  value: string | null; // data view field name
  onChange: (fieldName?: string) => void;
  fields: DataViewField[];
}

export function SingleFieldSelect({ placeholder, value, onChange, fields }: Props) {
  function renderOption(
    option: EuiComboBoxOptionOption<DataViewField>,
    searchValue: string,
    contentClassName: string
  ) {
    return (
      <EuiFlexGroup className={contentClassName} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={null}>
          <FieldIcon type={option.value!.type} fill="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const onSelection = (selectedOptions: Array<EuiComboBoxOptionOption<DataViewField>>) => {
    onChange(_.get(selectedOptions, '0.value.name'));
  };

  const selectedOptions: Array<EuiComboBoxOptionOption<DataViewField>> = [];
  if (value && fields) {
    const selectedField = fields.find((field: DataViewField) => field.name === value);
    if (selectedField) {
      selectedOptions.push({ value: selectedField, label: value });
    }
  }

  return (
    <EuiComboBox
      singleSelection={true}
      options={fieldsToOptions(fields)}
      selectedOptions={selectedOptions}
      onChange={onSelection}
      isDisabled={!fields}
      renderOption={renderOption}
      isClearable={false}
      placeholder={placeholder}
      compressed
    />
  );
}
