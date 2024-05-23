/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { EuiComboBox, EuiIcon } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { FieldHook } from '../../../../shared_imports';
import type { RequiredFieldInput } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import * as i18n from './translations';

interface TypeComboBoxProps {
  field: FieldHook<RequiredFieldInput>;
  itemId: string;
  typesByFieldName: Record<string, string[] | undefined>;
  typeWarning: string;
  typeError: { message: string } | undefined;
}

export function TypeComboBox({
  field,
  itemId,
  typesByFieldName,
  typeWarning,
  typeError,
}: TypeComboBoxProps) {
  const { value, setValue } = field;

  const selectableTypeOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const typesAvailableForSelectedName = typesByFieldName[value.name];
    const isSelectedTypeAvailable = (typesAvailableForSelectedName || []).includes(value.type);

    if (typesAvailableForSelectedName && isSelectedTypeAvailable) {
      /*
        Case: name is available, type is not available
        Selected field name is present in index patterns, so it has one or more types available for it.
        Allowing the user to select from them.
      */

      return typesAvailableForSelectedName.map((type) => ({
        label: type,
        value: type,
      }));
    } else if (typesAvailableForSelectedName) {
      /*
        Case: name is available, type is not available
        Selected field name is present in index patterns, but the selected type doesn't exist for it.
        Adding the selected type to the list of selectable options since it was selected before.
      */
      return typesAvailableForSelectedName
        .map((type) => ({
          label: type,
          value: type,
        }))
        .concat({ label: value.type, value: value.type });
    } else if (value.name) {
      /*
        Case: name is not available (so the type is also not available)
        Field name is set (not an empty string), but it's not present in index patterns.
        In such case the only selectable type option is the currenty selected type.
      */
      return [
        {
          label: value.type,
          value: value.type,
        },
      ];
    }

    return [];
  }, [value.name, value.type, typesByFieldName]);

  /*
    Using a state for `selectedTypeOptions` instead of using the field value directly
    to fix the issue where pressing the backspace key in combobox input would clear the field value
    and trigger a validation error. By using a separate state, we can clear the selected option 
    without clearing the field value.
  */
  const [selectedTypeOption, setSelectedTypeOption] = useState<
    EuiComboBoxOptionOption<string> | undefined
  >(selectableTypeOptions.find((option) => option.value === value.type));

  useEffect(() => {
    /* Re-computing the new selected type option when the field value changes */
    setSelectedTypeOption(selectableTypeOptions.find((option) => option.value === value.type));
  }, [value.type, selectableTypeOptions]);

  const handleTypeChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const newlySelectedOption: EuiComboBoxOptionOption<string> | undefined = selectedOptions[0];

      if (!newlySelectedOption) {
        /* This occurs when the user hits backspace in combobox */
        setSelectedTypeOption(undefined);
        return;
      }

      const updatedType = newlySelectedOption?.value || '';

      const updatedFieldValue: RequiredFieldInput = {
        name: value.name,
        type: updatedType,
      };

      setValue(updatedFieldValue);
    },
    [value.name, setValue]
  );

  const handleAddCustomType = useCallback(
    (newType: string) => {
      const updatedFieldValue: RequiredFieldInput = {
        name: value.name,
        type: newType,
      };

      setValue(updatedFieldValue);
    },
    [value.name, setValue]
  );

  return (
    <EuiComboBox
      data-test-subj={`requiredFieldTypeSelect-${value.type || 'empty'}`}
      aria-label={i18n.FIELD_TYPE}
      placeholder={i18n.FIELD_TYPE}
      singleSelection={{ asPlainText: true }}
      options={selectableTypeOptions}
      selectedOptions={selectedTypeOption ? [selectedTypeOption] : []}
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
  );
}
