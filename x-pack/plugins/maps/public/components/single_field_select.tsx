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
  EuiComboBoxProps,
  EuiComboBoxOptionOption,
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import { DataViewField } from '@kbn/data-views-plugin/public';

function fieldsToOptions(
  fields?: DataViewField[],
  isFieldDisabled?: (field: DataViewField) => boolean
): Array<EuiComboBoxOptionOption<DataViewField>> {
  if (!fields) {
    return [];
  }

  return fields
    .map((field) => {
      const option: EuiComboBoxOptionOption<DataViewField> = {
        value: field,
        label: field.displayName ? field.displayName : field.name,
      };
      if (isFieldDisabled && isFieldDisabled(field)) {
        option.disabled = true;
      }
      return option;
    })
    .sort((a, b) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });
}

type Props = Omit<
  EuiComboBoxProps<DataViewField>,
  'isDisabled' | 'onChange' | 'options' | 'renderOption' | 'selectedOptions' | 'singleSelection'
> & {
  fields?: DataViewField[];
  onChange: (fieldName?: string) => void;
  value: string | null; // index pattern field name
  isFieldDisabled?: (field: DataViewField) => boolean;
  getFieldDisabledReason?: (field: DataViewField) => string | null;
};

export function SingleFieldSelect({
  fields,
  getFieldDisabledReason,
  isFieldDisabled,
  onChange,
  value,
  ...rest
}: Props) {
  function renderOption(
    option: EuiComboBoxOptionOption<DataViewField>,
    searchValue: string,
    contentClassName: string
  ) {
    const content = (
      <EuiFlexGroup className={contentClassName} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={null}>
          <FieldIcon type={option.value!.type} fill="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const disabledReason =
      option.disabled && getFieldDisabledReason ? getFieldDisabledReason(option.value!) : null;

    return disabledReason ? (
      <EuiToolTip position="left" content={disabledReason}>
        {content}
      </EuiToolTip>
    ) : (
      content
    );
  }

  const onSelection = (selectedOptions: Array<EuiComboBoxOptionOption<DataViewField>>) => {
    onChange(_.get(selectedOptions, '0.value.name'));
  };

  const selectedOptions: Array<EuiComboBoxOptionOption<DataViewField>> = [];
  if (value && fields) {
    const selectedField = fields.find((field: DataViewField) => {
      return field.name === value;
    });
    if (selectedField) {
      selectedOptions.push({
        value: selectedField,
        label: selectedField.displayName ? selectedField.displayName : selectedField.name,
      });
    }
  }

  return (
    <EuiComboBox
      singleSelection={true}
      options={fieldsToOptions(fields, isFieldDisabled)}
      selectedOptions={selectedOptions}
      onChange={onSelection}
      isDisabled={!fields || fields.length === 0}
      renderOption={renderOption}
      {...rest}
    />
  );
}
