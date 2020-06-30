/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { IFieldType } from 'src/plugins/data/public';
import { FieldIcon } from '../../../../../src/plugins/kibana_react/public';

function fieldsToOptions(
  fields?: IFieldType[],
  isFieldDisabled?: (field: IFieldType) => boolean
): Array<EuiComboBoxOptionOption<IFieldType>> {
  if (!fields) {
    return [];
  }

  return fields
    .map((field) => {
      const option: EuiComboBoxOptionOption<IFieldType> = {
        value: field,
        label: field.name,
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
  EuiComboBoxProps<IFieldType>,
  'isDisabled' | 'onChange' | 'options' | 'renderOption' | 'selectedOptions' | 'singleSelection'
> & {
  fields?: IFieldType[];
  onChange: (fieldName?: string) => void;
  value: string | null; // index pattern field name
  isFieldDisabled?: (field: IFieldType) => boolean;
  getFieldDisabledReason?: (field: IFieldType) => string | null;
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
    option: EuiComboBoxOptionOption<IFieldType>,
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

  const onSelection = (selectedOptions: Array<EuiComboBoxOptionOption<IFieldType>>) => {
    onChange(_.get(selectedOptions, '0.value.name'));
  };

  const selectedOptions: Array<EuiComboBoxOptionOption<IFieldType>> = [];
  if (value && fields) {
    const selectedField = fields.find((field: IFieldType) => {
      return field.name === value;
    });
    if (selectedField) {
      selectedOptions.push({ value: selectedField, label: value });
    }
  }

  return (
    <EuiComboBox
      singleSelection={true}
      options={fieldsToOptions(fields, isFieldDisabled)}
      selectedOptions={selectedOptions}
      onChange={onSelection}
      isDisabled={!fields}
      renderOption={renderOption}
      {...rest}
    />
  );
}
