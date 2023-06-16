/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiComboBox, EuiHighlight } from '@elastic/eui';

export interface CategoryComponentProps {
  isLoading: boolean;
  onChange: (category: string) => void;
  availableCategories: string[];
  category?: string | null;
}

export const CategoryComponent: React.FC<CategoryComponentProps> = React.memo(
  ({ isLoading, onChange, category, availableCategories }) => {
    const [isInvalid, setIsInvalid] = useState<boolean>(false);

    const options = useMemo(() => {
      return availableCategories.map((label: string) => ({
        label,
      }));
    }, [availableCategories]);

    const [selectedOption, setSelectedOption] = useState<[{ label: string }] | []>(
      category ? [{ label: category }] : []
    );

    const onComboChange = useCallback(
      (currentOptions: EuiComboBoxOptionOption[]) => {
        setSelectedOption(currentOptions[0] ? [currentOptions[0]] : []);
        onChange(currentOptions[0]?.label ?? '');
      },
      [onChange]
    );

    const renderOption = useCallback(
      (option: EuiComboBoxOptionOption, searchValue: string, contentClassName: string) => {
        return (
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="none"
              responsive={false}
            >
              <EuiFlexItem>
                <EuiHighlight search={searchValue} className={contentClassName}>
                  {option.label}
                </EuiHighlight>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        );
      },
      []
    );

    const onCreateOption = (searchValue = '') => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        setIsInvalid(true);
      }

      const newOption = {
        label: normalizedSearchValue,
      };

      onChange(normalizedSearchValue);
      setSelectedOption([newOption]);
    };

    return (
      <EuiComboBox
        fullWidth
        singleSelection
        async
        isLoading={isLoading}
        isInvalid={isInvalid}
        options={options}
        data-test-subj="categories-list"
        selectedOptions={selectedOption}
        onChange={onComboChange}
        renderOption={renderOption}
        onCreateOption={onCreateOption}
        aria-label="categories-list"
        isClearable
      />
    );
  }
);

CategoryComponent.displayName = 'CategoryComponent';
