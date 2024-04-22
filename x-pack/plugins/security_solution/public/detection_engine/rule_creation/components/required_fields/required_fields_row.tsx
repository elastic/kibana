/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiTextColor,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { FIELD_TYPES, UseField } from '../../../../shared_imports';
import * as i18n from './translations';

import type { FieldHook, ArrayItem, FieldConfig } from '../../../../shared_imports';
import type { RequiredFieldWithOptionalEcs } from './types';

interface RequiredFieldRowProps {
  item: ArrayItem;
  removeItem: (id: number) => void;
  typesByFieldName: Record<string, string[]>;
  availableFieldNames: string[];
  getWarnings: (name: string) => { nameWarning: string; typeWarning: string };
}

export const RequiredFieldRow = ({
  item,
  removeItem,
  typesByFieldName,
  availableFieldNames,
  getWarnings,
}: RequiredFieldRowProps) => {
  const handleRemove = useCallback(() => removeItem(item.id), [removeItem, item.id]);

  return (
    <UseField
      key={item.id}
      path={item.path}
      config={REQUIRED_FIELDS_FIELD_CONFIG}
      component={RequiredFieldRowInner}
      readDefaultValueOnForm={!item.isNew}
      componentProps={{
        onRemove: handleRemove,
        typesByFieldName,
        getWarnings,
      }}
      availableFieldNames={availableFieldNames}
    />
  );
};

interface RequiredFieldRowInnerProps {
  field: FieldHook<RequiredFieldWithOptionalEcs>;
  onRemove: () => void;
  typesByFieldName: Record<string, string[]>;
  availableFieldNames: string[];
  getWarnings: (name: string) => { nameWarning: string; typeWarning: string };
}

const RequiredFieldRowInner = ({
  field,
  typesByFieldName,
  onRemove,
  availableFieldNames,
  getWarnings,
}: RequiredFieldRowInnerProps) => {
  // Do not not add empty option to the list of selectable field names
  const selectableNameOptions: Array<EuiComboBoxOptionOption<string>> = (
    field.value.name ? [field.value.name] : []
  )
    .concat(availableFieldNames)
    .map((name) => ({
      label: name,
      value: name,
    }));

  const selectedNameOption = selectableNameOptions.find(
    (option) => option.label === field.value.name
  );

  const selectedNameOptions = selectedNameOption ? [selectedNameOption] : [];

  const typesAvailableForSelectedName = typesByFieldName[field.value.name];

  let selectableTypeOptions: Array<EuiComboBoxOptionOption<string>> = [];
  if (typesAvailableForSelectedName) {
    const isSelectedTypeAvailable = typesAvailableForSelectedName.includes(field.value.type);

    selectableTypeOptions = typesAvailableForSelectedName.map((type) => ({
      label: type,
      value: type,
    }));

    if (!isSelectedTypeAvailable) {
      // case: field name exists, but such type is not among the list of field types
      selectableTypeOptions.push({ label: field.value.type, value: field.value.type });
    }
  } else {
    if (field.value.type) {
      // case: no such field name in index patterns
      selectableTypeOptions = [
        {
          label: field.value.type,
          value: field.value.type,
        },
      ];
    }
  }

  const selectedTypeOption = selectableTypeOptions.find(
    (option) => option.value === field.value.type
  );

  const selectedTypeOptions = selectedTypeOption ? [selectedTypeOption] : [];

  const { nameWarning, typeWarning } = getWarnings(field.value.name);

  const warningText = nameWarning || typeWarning;

  const handleNameChange = useCallback(
    ([newlySelectedOption]: Array<EuiComboBoxOptionOption<string>>) => {
      const updatedName = newlySelectedOption.value || '';

      const isCurrentTypeAvailableForNewName = typesByFieldName[updatedName]?.includes(
        field.value.type
      );

      const updatedType = isCurrentTypeAvailableForNewName
        ? field.value.type
        : typesByFieldName[updatedName][0];

      const updatedFieldValue: RequiredFieldWithOptionalEcs = {
        name: updatedName,
        type: updatedType,
      };

      field.setValue(updatedFieldValue);
    },
    [field, typesByFieldName]
  );

  const handleTypeChange = useCallback(
    ([newlySelectedOption]: Array<EuiComboBoxOptionOption<string>>) => {
      const updatedType = newlySelectedOption.value || '';

      const updatedFieldValue: RequiredFieldWithOptionalEcs = {
        name: field.value.name,
        type: updatedType,
      };

      field.setValue(updatedFieldValue);
    },
    [field]
  );

  return (
    <EuiFormRow
      fullWidth
      helpText={
        warningText ? (
          <EuiTextColor color="warning" id={`${field.value.name}-warning`}>
            {warningText}
          </EuiTextColor>
        ) : (
          ''
        )
      }
      color="warning"
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <EuiComboBox
            data-test-subj={`requiredFieldNameSelect-${field.value.name || 'empty'}`}
            aria-label="Field name"
            placeholder="Field name"
            singleSelection={{ asPlainText: true }}
            options={selectableNameOptions}
            selectedOptions={selectedNameOptions}
            onChange={handleNameChange}
            isClearable={false}
            prepend={
              nameWarning ? (
                <EuiIcon
                  size="s"
                  type="warning"
                  color={euiThemeVars.euiColorWarningText}
                  aria-labelledby={`${field.value.name}-warning`}
                />
              ) : undefined
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiComboBox
            data-test-subj={`requiredFieldTypeSelect-${field.value.type || 'empty'}`}
            isDisabled={
              !selectedTypeOption ||
              selectedTypeOption.label === '' ||
              selectableTypeOptions.length <= 1
            }
            aria-label="Field type"
            placeholder="Field type"
            singleSelection={{ asPlainText: true }}
            options={selectableTypeOptions}
            selectedOptions={selectedTypeOptions}
            onChange={handleTypeChange}
            isClearable={false}
            prepend={
              typeWarning ? (
                <EuiIcon
                  size="s"
                  type="warning"
                  color={euiThemeVars.euiColorWarningText}
                  aria-labelledby={`${field.value.name}-warning`}
                />
              ) : undefined
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            onClick={onRemove}
            aria-label={i18n.REMOVE_REQUIRED_FIELD_BUTTON_ARIA_LABEL}
            data-test-subj={`removeRequiredFieldButton-${field.value.name}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

const REQUIRED_FIELDS_FIELD_CONFIG: FieldConfig<
  RequiredFieldWithOptionalEcs,
  RequiredFieldWithOptionalEcs
> = {
  type: FIELD_TYPES.JSON,
  //   validations: [{ validator: validateRelatedIntegration }],
  defaultValue: { name: '', type: '' },
};
