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
import { IndexPatternField } from '@kbn/data-plugin/public';

function fieldsToOptions(
  fields?: IndexPatternField[],
  isFieldDisabled?: (field: IndexPatternField) => boolean
): Array<EuiComboBoxOptionOption<IndexPatternField>> {
  if (!fields) {
    return [];
  }

  return fields
    .map((field) => {
      const option: EuiComboBoxOptionOption<IndexPatternField> = {
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
  EuiComboBoxProps<IndexPatternField>,
  'isDisabled' | 'onChange' | 'options' | 'renderOption' | 'selectedOptions' | 'singleSelection'
> & {
  fields?: IndexPatternField[];
  onChange: (fieldName?: string) => void;
  value: string | null; // index pattern field name
  isFieldDisabled?: (field: IndexPatternField) => boolean;
  getFieldDisabledReason?: (field: IndexPatternField) => string | null;
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
    option: EuiComboBoxOptionOption<IndexPatternField>,
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

  const onSelection = (selectedOptions: Array<EuiComboBoxOptionOption<IndexPatternField>>) => {
    onChange(_.get(selectedOptions, '0.value.name'));
  };

  const selectedOptions: Array<EuiComboBoxOptionOption<IndexPatternField>> = [];
  if (value && fields) {
    const selectedField = fields.find((field: IndexPatternField) => {
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
