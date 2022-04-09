/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiComboBox,
  EuiComboBoxProps,
  EuiComboBoxOptionOption,
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../../common/constants';
import { StyleField } from '../style_fields_helper';

function renderOption(
  option: EuiComboBoxOptionOption<StyleField>,
  searchValue: string,
  contentClassName: string
) {
  const fieldIcon = option.value ? <FieldIcon type={option.value.type} fill="none" /> : null;
  return (
    <EuiFlexGroup className={contentClassName} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={null}>{fieldIcon}</EuiFlexItem>
      <EuiFlexItem>
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function groupFieldsByOrigin(fields: StyleField[]) {
  const fieldsByOriginMap = new Map<FIELD_ORIGIN, StyleField[]>();
  fields.forEach((field) => {
    if (fieldsByOriginMap.has(field.origin)) {
      const fieldsList = fieldsByOriginMap.get(field.origin)!;
      fieldsList.push(field);
      fieldsByOriginMap.set(field.origin, fieldsList);
    } else {
      fieldsByOriginMap.set(field.origin, [field]);
    }
  });

  function fieldsListToOptions(fieldsList: StyleField[]) {
    return fieldsList
      .map((field) => {
        return {
          value: field,
          label: field.label,
          disabled: field.isUnsupported,
          title: field.unsupportedMsg,
        };
      })
      .sort((a, b) => {
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      });
  }

  if (fieldsByOriginMap.size === 1) {
    // do not show origin group if all fields are from same origin
    const onlyOriginKey = fieldsByOriginMap.keys().next().value;
    const fieldsList = fieldsByOriginMap.get(onlyOriginKey)!;
    return fieldsListToOptions(fieldsList);
  }

  const optionGroups: Array<{
    label: string;
    options: Array<EuiComboBoxOptionOption<StyleField>>;
  }> = [];
  fieldsByOriginMap.forEach((fieldsList, fieldOrigin) => {
    optionGroups.push({
      label: i18n.translate('xpack.maps.style.fieldSelect.OriginLabel', {
        defaultMessage: 'Fields from {fieldOrigin}',
        values: { fieldOrigin },
      }),
      options: fieldsListToOptions(fieldsList),
    });
  });

  optionGroups.sort(
    (a: EuiComboBoxOptionOption<StyleField>, b: EuiComboBoxOptionOption<StyleField>) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    }
  );

  return optionGroups;
}

type Props = {
  fields: StyleField[];
  selectedFieldName: string;
  onChange: ({ field }: { field: StyleField | null }) => void;
  styleName: VECTOR_STYLES;
} & Omit<
  EuiComboBoxProps<StyleField>,
  | 'selectedOptions'
  | 'options'
  | 'onChange'
  | 'singleSelection'
  | 'isClearable'
  | 'fullWidth'
  | 'renderOption'
>;

export function FieldSelect({ fields, selectedFieldName, onChange, styleName, ...rest }: Props) {
  const onFieldChange = (selectedFields: Array<EuiComboBoxOptionOption<StyleField>>) => {
    onChange({
      field: selectedFields.length > 0 && selectedFields[0].value ? selectedFields[0].value : null,
    });
  };

  let selectedOption;
  if (selectedFieldName) {
    const field = fields.find((f) => {
      return f.name === selectedFieldName;
    });
    if (field) {
      selectedOption = {
        value: field,
        label: field.label,
      };
    }
  }

  return (
    <EuiComboBox
      selectedOptions={selectedOption ? [selectedOption] : []}
      options={groupFieldsByOrigin(fields)}
      onChange={onFieldChange}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      fullWidth
      placeholder={i18n.translate('xpack.maps.styles.vector.selectFieldPlaceholder', {
        defaultMessage: 'Select a field',
      })}
      renderOption={renderOption}
      data-test-subj={`styleFieldSelect_${styleName}`}
      {...rest}
    />
  );
}
