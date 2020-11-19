/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';

import { getFriendlyNameForPartitionId } from '../../../../common/log_analysis';

type DatasetOptionProps = EuiComboBoxOptionOption<string>;

export const DatasetsSelector: React.FunctionComponent<{
  availableDatasets: string[];
  isLoading?: boolean;
  onChangeDatasetSelection: (datasets: string[]) => void;
  selectedDatasets: string[];
}> = ({ availableDatasets, isLoading = false, onChangeDatasetSelection, selectedDatasets }) => {
  const options = useMemo<DatasetOptionProps[]>(
    () =>
      availableDatasets.map((dataset) => ({
        value: dataset,
        label: getFriendlyNameForPartitionId(dataset),
      })),
    [availableDatasets]
  );

  const selectedOptions = useMemo(
    () => options.filter(({ value }) => value != null && selectedDatasets.includes(value)),
    [options, selectedDatasets]
  );

  const handleChange = useCallback(
    (newSelectedOptions: DatasetOptionProps[]) =>
      onChangeDatasetSelection(newSelectedOptions.map(({ value }) => value).filter(isDefined)),
    [onChangeDatasetSelection]
  );

  return (
    <EuiComboBox
      aria-label={datasetFilterPlaceholder}
      isLoading={isLoading}
      onChange={handleChange}
      options={options}
      placeholder={datasetFilterPlaceholder}
      selectedOptions={selectedOptions}
    />
  );
};

const datasetFilterPlaceholder = i18n.translate(
  'xpack.infra.logs.analysis.datasetFilterPlaceholder',
  {
    defaultMessage: 'Filter by datasets',
  }
);

const isDefined = <Value extends any>(value: Value): value is NonNullable<Value> => value != null;
