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

interface UseTypeFieldReturn {
  selectableTypeOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedTypeOptions: Array<EuiComboBoxOptionOption<string>>;
  handleTypeChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  handleAddCustomType: (newType: string) => void;
}

export const useTypeField = (
  field: FieldHook<RequiredFieldInput>,
  typesByFieldName: Record<string, string[] | undefined>
): UseTypeFieldReturn => {
  const selectableTypeOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const typesAvailableForSelectedName = typesByFieldName[field.value.name];
    const isSelectedTypeAvailable = (typesAvailableForSelectedName || []).includes(
      field.value.type
    );

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
        .concat({ label: field.value.type, value: field.value.type });
    } else if (field.value.name) {
      /*
        Case: name is not available (so the type is also not available)
        Field name is set (not an empty string), but it's not present in index patterns.
        In such case the only selectable type option is the currenty selected type.
      */
      return [
        {
          label: field.value.type,
          value: field.value.type,
        },
      ];
    }

    return [];
  }, [field.value.name, field.value.type, typesByFieldName]);

  /*
    Using a state for `selectedTypeOptions` instead of using the field value directly
    to fix the issue where pressing the backspace key in combobox input would clear the field value
    and trigger a validation error. By using a separate state, we can clear the selected option 
    without clearing the field value.
   */
  const [selectedTypeOptions, setSelectedTypeOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(() => {
    const selectedTypeOption = selectableTypeOptions.find(
      (option) => option.value === field.value.type
    );

    return selectedTypeOption ? [selectedTypeOption] : [];
  });

  useEffect(() => {
    /* Re-computing the new selected type option when the field value changes */
    const selectedTypeOption = selectableTypeOptions.find(
      (option) => option.value === field.value.type
    );

    setSelectedTypeOptions(selectedTypeOption ? [selectedTypeOption] : []);
  }, [field.value.type, selectableTypeOptions]);

  const handleTypeChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const newlySelectedOption: EuiComboBoxOptionOption<string> | undefined = selectedOptions[0];

      if (!newlySelectedOption) {
        /* This occurs when the user hits backspace in combobox */
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

  return {
    selectableTypeOptions,
    selectedTypeOptions,
    handleTypeChange,
    handleAddCustomType,
  };
};
