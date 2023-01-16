/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DatasetComboBox: React.FC<{
  value: any;
  onChange: (newValue: any) => void;
  datasets: string[];
  isDisabled?: boolean;
}> = ({ value, onChange, datasets, isDisabled }) => {
  const datasetOptions = datasets.map((dataset: string) => ({ label: dataset })) ?? [];
  const defaultOption = 'generic';
  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string }>>([
    {
      label: value ?? defaultOption,
    },
  ]);

  useEffect(() => {
    if (!value) onChange(defaultOption);
  }, [value, defaultOption, onChange]);

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
      aria-label={i18n.translate('xpack.fleet.datasetCombo.ariaLabel', {
        defaultMessage: 'Dataset combo box',
      })}
      placeholder={i18n.translate('xpack.fleet.datasetCombo.placeholder', {
        defaultMessage: 'Select a dataset',
      })}
      singleSelection={{ asPlainText: true }}
      options={datasetOptions}
      selectedOptions={selectedOptions}
      onCreateOption={onCreateOption}
      onChange={onDatasetChange}
      customOptionText={i18n.translate('xpack.fleet.datasetCombo.customOptionText', {
        defaultMessage: 'Add {searchValue} as a custom option',
        values: { searchValue: '{searchValue}' },
      })}
      isClearable={false}
      isDisabled={isDisabled}
    />
  );
};
