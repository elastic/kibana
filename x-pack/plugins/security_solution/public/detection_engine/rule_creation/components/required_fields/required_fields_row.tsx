/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
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

import type {
  ArrayItem,
  ERROR_CODE,
  FieldConfig,
  FieldHook,
  FormData,
  ValidationFunc,
} from '../../../../shared_imports';
import type { RequiredFieldInput } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import type { RequiredFieldWithOptionalEcs } from './types';

const SINGLE_SELECTION_AS_PLAIN_TEXT = { asPlainText: true };

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

  const rowFieldConfig: FieldConfig<
    RequiredFieldWithOptionalEcs,
    RequiredFieldInput,
    RequiredFieldInput
  > = useMemo(
    () => ({
      type: FIELD_TYPES.JSON,
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
      component={RequiredFieldRowInner}
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

interface RequiredFieldRowInnerProps {
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

const RequiredFieldRowInner = ({
  field,
  typesByFieldName,
  onRemove,
  availableFieldNames,
  getWarnings,
  itemId,
}: RequiredFieldRowInnerProps) => {
  // Do not not add empty option to the list of selectable field names
  const selectableNameOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      (field.value.name ? [field.value.name] : []).concat(availableFieldNames).map((name) => ({
        label: name,
        value: name,
      })),
    [availableFieldNames, field.value.name]
  );

  const [selectedNameOptions, setSelectedNameOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(() => {
    const selectedNameOption = selectableNameOptions.find(
      (option) => option.label === field.value.name
    );

    return selectedNameOption ? [selectedNameOption] : [];
  });

  useEffect(() => {
    const selectedNameOption = selectableNameOptions.find(
      (option) => option.label === field.value.name
    );

    setSelectedNameOptions(selectedNameOption ? [selectedNameOption] : []);
  }, [field.value.name, selectableNameOptions]);

  const selectableTypeOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const typesAvailableForSelectedName = typesByFieldName[field.value.name];

    let _selectableTypeOptions: Array<EuiComboBoxOptionOption<string>> = [];
    if (typesAvailableForSelectedName) {
      const isSelectedTypeAvailable = typesAvailableForSelectedName.includes(field.value.type);

      _selectableTypeOptions = typesAvailableForSelectedName.map((type) => ({
        label: type,
        value: type,
      }));

      if (!isSelectedTypeAvailable) {
        // case: field name exists, but such type is not among the list of field types
        _selectableTypeOptions.push({ label: field.value.type, value: field.value.type });
      }
    } else {
      if (field.value.type) {
        // case: no such field name in index patterns
        _selectableTypeOptions = [
          {
            label: field.value.type,
            value: field.value.type,
          },
        ];
      }
    }

    return _selectableTypeOptions;
  }, [field.value.name, field.value.type, typesByFieldName]);

  const [selectedTypeOptions, setSelectedTypeOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(() => {
    const selectedTypeOption = selectableTypeOptions.find(
      (option) => option.value === field.value.type
    );

    return selectedTypeOption ? [selectedTypeOption] : [];
  });

  useEffect(() => {
    const selectedTypeOption = selectableTypeOptions.find(
      (option) => option.value === field.value.type
    );

    setSelectedTypeOptions(selectedTypeOption ? [selectedTypeOption] : []);
  }, [field.value.type, selectableTypeOptions]);

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

  const handleNameChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const newlySelectedOption: EuiComboBoxOptionOption<string> | undefined = selectedOptions[0];

      if (!newlySelectedOption) {
        setSelectedNameOptions([]);
        return;
      }

      const updatedName = newlySelectedOption?.value || '';

      const updatedType = pickTypeForName(updatedName, field.value.type, typesByFieldName);

      const updatedFieldValue: RequiredFieldInput = {
        name: updatedName,
        type: updatedType,
      };

      field.setValue(updatedFieldValue);
    },
    [field, typesByFieldName]
  );

  const handleTypeChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const newlySelectedOption: EuiComboBoxOptionOption<string> | undefined = selectedOptions[0];

      if (!newlySelectedOption) {
        setSelectedTypeOptions([]);
        return;
      }

      const updatedType = newlySelectedOption?.value || '';

      const updatedFieldValue: RequiredFieldInput = {
        name: field.value.name,
        type: updatedType,
      };

      field.setValue(updatedFieldValue);
    },
    [field]
  );

  const handleAddCustomName = useCallback(
    (newName: string) => {
      const updatedFieldValue: RequiredFieldInput = {
        name: newName,
        type: pickTypeForName(newName, field.value.type, typesByFieldName),
      };

      field.setValue(updatedFieldValue);
    },
    [field, typesByFieldName]
  );

  const handleAddCustomType = useCallback(
    (newType: string) => {
      const updatedFieldValue: RequiredFieldInput = {
        name: field.value.name,
        type: newType,
      };

      field.setValue(updatedFieldValue);
    },
    [field]
  );

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
          <EuiComboBox
            data-test-subj={`requiredFieldNameSelect-${field.value.name || 'empty'}`}
            aria-label={i18n.FIELD_NAME}
            placeholder={i18n.FIELD_NAME}
            singleSelection={SINGLE_SELECTION_AS_PLAIN_TEXT}
            options={selectableNameOptions}
            selectedOptions={selectedNameOptions}
            onChange={handleNameChange}
            isClearable={false}
            onCreateOption={handleAddCustomName}
            isInvalid={Boolean(nameError)}
            prepend={
              nameWarning ? (
                <EuiIcon
                  size="s"
                  type="warning"
                  color={euiThemeVars.euiColorWarningText}
                  data-test-subj="warningIcon"
                  aria-labelledby={`warningText-${itemId}`}
                />
              ) : undefined
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiComboBox
            data-test-subj={`requiredFieldTypeSelect-${field.value.type || 'empty'}`}
            aria-label={i18n.FIELD_TYPE}
            placeholder={i18n.FIELD_TYPE}
            singleSelection={SINGLE_SELECTION_AS_PLAIN_TEXT}
            options={selectableTypeOptions}
            selectedOptions={selectedTypeOptions}
            onChange={handleTypeChange}
            isClearable={false}
            onCreateOption={handleAddCustomType}
            isInvalid={Boolean(typeError)}
            prepend={
              typeWarning ? (
                <EuiIcon
                  size="s"
                  type="warning"
                  color={euiThemeVars.euiColorWarningText}
                  data-test-subj="warningIcon"
                  aria-labelledby={`warningText-${itemId}`}
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

function makeValidateRequiredField(parentFieldPath: string) {
  return function validateRequiredField(
    ...args: Parameters<ValidationFunc<FormData, string, RequiredFieldInput>>
  ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined {
    const [{ value, path, form }] = args;

    const formData = form.getFormData();
    const parentFieldData: RequiredFieldInput[] = formData[parentFieldPath];

    const isFieldNameUsedMoreThanOnce =
      parentFieldData.filter((field) => field.name === value.name).length > 1;

    if (isFieldNameUsedMoreThanOnce) {
      return {
        code: 'ERR_FIELD_FORMAT',
        path: `${path}.name`,
        message: i18n.FIELD_NAME_USED_MORE_THAN_ONCE(value.name),
      };
    }

    /* Allow empty rows. They are going to be removed before submission. */
    if (value.name.trim().length === 0 && value.type.trim().length === 0) {
      return;
    }

    if (value.name.trim().length === 0) {
      return {
        code: 'ERR_FIELD_MISSING',
        path: `${path}.name`,
        message: i18n.FIELD_NAME_REQUIRED,
      };
    }

    if (value.type.trim().length === 0) {
      return {
        code: 'ERR_FIELD_MISSING',
        path: `${path}.type`,
        message: i18n.FIELD_TYPE_REQUIRED,
      };
    }
  };
}

function pickTypeForName(
  currentName: string,
  currentType: string,
  typesByFieldName: Record<string, string[] | undefined>
) {
  const typesAvailableForNewName = typesByFieldName[currentName] || [];
  const isCurrentTypeAvailableForNewName = typesAvailableForNewName.includes(currentType);

  let updatedType = currentType;
  if (isCurrentTypeAvailableForNewName) {
    updatedType = currentType;
  } else if (typesAvailableForNewName.length > 0) {
    updatedType = typesAvailableForNewName[0];
  }

  return updatedType;
}
