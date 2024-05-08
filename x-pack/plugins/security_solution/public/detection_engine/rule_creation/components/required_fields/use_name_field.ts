/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { FieldHook } from '../../../../shared_imports';
import type { RequiredFieldInput } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';

interface UseNameFieldReturn {
  selectableNameOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedNameOptions: Array<EuiComboBoxOptionOption<string>>;
  handleNameChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  handleAddCustomName: (newName: string) => void;
}

export const useNameField = (
  field: FieldHook<RequiredFieldInput>,
  availableFieldNames: string[],
  typesByFieldName: Record<string, string[] | undefined>
): UseNameFieldReturn => {
  const selectableNameOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      /* Not adding an empty string to the list of selectable field names */
      (field.value.name ? [field.value.name] : []).concat(availableFieldNames).map((name) => ({
        label: name,
        value: name,
      })),
    [availableFieldNames, field.value.name]
  );

  /*
    Using a state for `selectedNameOptions` instead of using the field value directly
    to fix the issue where pressing the backspace key in combobox input would clear the field value
    and trigger a validation error. By using a separate state, we can clear the selected option 
    without clearing the field value.
   */
  const [selectedNameOptions, setSelectedNameOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(() => {
    const selectedNameOption = selectableNameOptions.find(
      (option) => option.label === field.value.name
    );

    return selectedNameOption ? [selectedNameOption] : [];
  });

  useEffect(() => {
    /* Re-computing the new selected name option when the field value changes */
    const selectedNameOption = selectableNameOptions.find(
      (option) => option.label === field.value.name
    );

    setSelectedNameOptions(selectedNameOption ? [selectedNameOption] : []);
  }, [field.value.name, selectableNameOptions]);

  const handleNameChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const newlySelectedOption: EuiComboBoxOptionOption<string> | undefined = selectedOptions[0];

      if (!newlySelectedOption) {
        /* This occurs when the user hits backspace in combobox */
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

  return {
    selectableNameOptions,
    selectedNameOptions,
    handleNameChange,
    handleAddCustomName,
  };
};

function pickTypeForName(
  currentName: string,
  currentType: string,
  typesByFieldName: Record<string, string[] | undefined>
) {
  const typesAvailableForNewName = typesByFieldName[currentName] || [];
  const isCurrentTypeAvailableForNewName = typesAvailableForNewName.includes(currentType);

  /* First try to keep the current type if it's available for the new name */
  if (isCurrentTypeAvailableForNewName) {
    return currentType;
  }

  /* If it's not available, pick the first available type */
  if (typesAvailableForNewName.length > 0) {
    return typesAvailableForNewName[0];
  }

  /* Otherwise use currently selected type */
  return currentType;
}
