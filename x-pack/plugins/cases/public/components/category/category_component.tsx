/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { ADD_CATEGORY_CUSTOM_OPTION_LABEL_COMBO_BOX } from './translations';

export interface CategoryComponentProps {
  isLoading: boolean;
  onChange: (category: string | null) => void;
  availableCategories: string[];
  category?: string | null;
  isInvalid?: boolean;
}

export const CategoryComponent: React.FC<CategoryComponentProps> = React.memo(
  ({ isLoading, onChange, category, availableCategories, isInvalid = false }) => {
    const options = useMemo(() => {
      return availableCategories.map((label: string) => ({
        label,
      }));
    }, [availableCategories]);

    const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
      category != null ? [{ label: category }] : []
    );

    const onComboChange = useCallback(
      (currentOptions: Array<EuiComboBoxOptionOption<string>>) => {
        const value = currentOptions[0]?.label;

        setSelectedOptions(currentOptions);
        onChange(value);
      },
      [onChange]
    );

    const onCreateOption = (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim();

      const newOption = {
        label: normalizedSearchValue,
      };

      onComboChange([newOption]);
    };

    return (
      <EuiComboBox
        fullWidth
        singleSelection={{ asPlainText: true }}
        isLoading={isLoading}
        isDisabled={isLoading}
        isInvalid={isInvalid}
        options={options}
        data-test-subj="categories-list"
        selectedOptions={selectedOptions}
        onChange={onComboChange}
        onCreateOption={onCreateOption}
        aria-label="categories-list"
        isClearable
        customOptionText={ADD_CATEGORY_CUSTOM_OPTION_LABEL_COMBO_BOX}
        isCaseSensitive
      />
    );
  }
);

CategoryComponent.displayName = 'CategoryComponent';
