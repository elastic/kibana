/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiTextColor } from '@elastic/eui';
import { UseField } from '../../../../shared_imports';
import { NameComboBox } from './name_combobox';
import { TypeComboBox } from './type_combobox';
import { makeValidateRequiredField } from './make_validate_required_field';
import * as i18n from './translations';

import type { ArrayItem, FieldConfig, FieldHook } from '../../../../shared_imports';
import type {
  RequiredField,
  RequiredFieldInput,
} from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';

interface RequiredFieldRowProps {
  item: ArrayItem;
  removeItem: (id: number) => void;
  typesByFieldName: Record<string, string[] | undefined>;
  availableFieldNames: string[];
  getWarnings: ({ name, type }: { name: string; type: string }) => {
    nameWarning: string;
    typeWarning: string;
  };
  parentFieldPath: string;
}

export const RequiredFieldRow = ({
  item,
  removeItem,
  typesByFieldName,
  availableFieldNames,
  getWarnings,
  parentFieldPath,
}: RequiredFieldRowProps) => {
  const handleRemove = useCallback(() => removeItem(item.id), [removeItem, item.id]);

  const rowFieldConfig: FieldConfig<RequiredField | RequiredFieldInput, {}, RequiredFieldInput> =
    useMemo(
      () => ({
        deserializer: (value) => {
          const rowValueWithoutEcs: RequiredFieldInput = {
            name: value.name,
            type: value.type,
          };

          return rowValueWithoutEcs;
        },
        validations: [{ validator: makeValidateRequiredField(parentFieldPath) }],
        defaultValue: { name: '', type: '' },
      }),
      [parentFieldPath]
    );

  return (
    <UseField
      key={item.id}
      path={item.path}
      config={rowFieldConfig}
      component={RequiredFieldField}
      readDefaultValueOnForm={!item.isNew}
      componentProps={{
        itemId: item.id,
        onRemove: handleRemove,
        typesByFieldName,
        getWarnings,
      }}
      availableFieldNames={availableFieldNames}
    />
  );
};

interface RequiredFieldFieldProps {
  field: FieldHook<RequiredFieldInput>;
  onRemove: () => void;
  typesByFieldName: Record<string, string[] | undefined>;
  availableFieldNames: string[];
  getWarnings: ({ name, type }: { name: string; type: string }) => {
    nameWarning: string;
    typeWarning: string;
  };
  itemId: string;
}

const RequiredFieldField = ({
  field,
  typesByFieldName,
  onRemove,
  availableFieldNames,
  getWarnings,
  itemId,
}: RequiredFieldFieldProps) => {
  const { nameWarning, typeWarning } = getWarnings(field.value);
  const warningMessage = nameWarning || typeWarning;

  const [nameError, typeError] = useMemo(() => {
    return [
      field.errors.find((error) => 'path' in error && error.path === `${field.path}.name`),
      field.errors.find((error) => 'path' in error && error.path === `${field.path}.type`),
    ];
  }, [field.path, field.errors]);
  const hasError = Boolean(nameError) || Boolean(typeError);
  const errorMessage = nameError?.message || typeError?.message;

  return (
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      error={errorMessage}
      helpText={
        warningMessage && !hasError ? (
          <EuiTextColor
            color="warning"
            id={`warningText-${itemId}`}
            data-test-subj={`${field.value.name}-warningText`}
          >
            {warningMessage}
          </EuiTextColor>
        ) : (
          ''
        )
      }
      color="warning"
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <NameComboBox
            field={field}
            itemId={itemId}
            availableFieldNames={availableFieldNames}
            typesByFieldName={typesByFieldName}
            nameWarning={nameWarning}
            nameError={nameError}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <TypeComboBox
            field={field}
            itemId={itemId}
            typesByFieldName={typesByFieldName}
            typeWarning={typeWarning}
            typeError={typeError}
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
