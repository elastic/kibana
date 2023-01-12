/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DataStream } from '../../../../../../../../../common/types';

interface SelectedDataset {
  dataset: string;
  package: string;
}
export const DatasetComboBox: React.FC<{
  value?: SelectedDataset;
  onChange: (newValue: SelectedDataset) => void;
  datastreams: DataStream[];
  pkgName?: string;
  isDisabled?: boolean;
}> = ({ value, onChange, datastreams, isDisabled, pkgName = '' }) => {
  const datasetOptions =
    datastreams.map((datastream: DataStream) => ({
      label: datastream.dataset,
      value: datastream,
    })) ?? [];
  const existingGenericStream = datasetOptions.find((ds) => ds.label === 'generic');
  const valueAsOption = value
    ? { label: value.dataset, value: { dataset: value.dataset, package: value.package } }
    : undefined;
  const defaultOption = valueAsOption || existingGenericStream || { label: 'generic' };

  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string }>>([defaultOption]);

  useEffect(() => {
    if (!value) onChange({ dataset: defaultOption.label, package: pkgName });
  }, [value, defaultOption.label, onChange, pkgName]);

  const onDatasetChange = (newSelectedOptions: Array<{ label: string; value?: DataStream }>) => {
    setSelectedOptions(newSelectedOptions);
    const dataStream = newSelectedOptions[0].value;
    onChange({
      dataset: newSelectedOptions[0].label,
      package: !dataStream || typeof dataStream === 'string' ? pkgName : dataStream.package,
    });
  };

  const onCreateOption = (searchValue: string = '') => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();
    if (!normalizedSearchValue) {
      return;
    }
    const newOption = {
      label: searchValue,
      value: { dataset: searchValue, package: pkgName },
    };
    setSelectedOptions([newOption]);
    onChange({
      dataset: searchValue,
      package: pkgName,
    });
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
