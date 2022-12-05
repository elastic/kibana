/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiComboBox } from '@elastic/eui';

export const DatasetComboBox: React.FC<{
  value: any;
  onChange: (newValue: any) => void;
  datasets: string[];
}> = ({ value, onChange, datasets }) => {
  const datasetOptions = datasets.map((dataset: string) => ({ label: dataset })) ?? [];
  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string }>>(
    value
      ? [
          {
            label: value,
          },
        ]
      : []
  );

  const onDatasetChange = (newSelectedOptions: Array<{ label: string }>) => {
    setSelectedOptions(newSelectedOptions);
    onChange(newSelectedOptions[0]?.label);
  };

  const onCreateOption = (searchValue: string = '') => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();
    if (!normalizedSearchValue) {
      return;
    }
    const newOption = {
      label: searchValue,
    };
    setSelectedOptions([newOption]);
    onChange(searchValue);
  };

  return (
    <EuiComboBox
      aria-label="Dataset combo box"
      placeholder="Select a dataset"
      singleSelection={{ asPlainText: true }}
      options={datasetOptions}
      selectedOptions={selectedOptions}
      onCreateOption={onCreateOption}
      onChange={onDatasetChange}
      customOptionText="Add {searchValue} as a custom option"
    />
  );
};
