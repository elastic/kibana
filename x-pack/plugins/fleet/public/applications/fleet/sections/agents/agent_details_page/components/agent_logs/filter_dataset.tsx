/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useEffect } from 'react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStartServices } from '../../../../../hooks';
import { AGENT_LOG_INDEX_PATTERN, DATASET_FIELD, AGENT_DATASET } from './constants';

export const DatasetFilter: React.FunctionComponent<{
  selectedDatasets: string[];
  onToggleDataset: (dataset: string) => void;
}> = memo(({ selectedDatasets, onToggleDataset }) => {
  const { data } = useStartServices();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [datasetValues, setDatasetValues] = useState<string[]>([AGENT_DATASET]);

  useEffect(() => {
    const fetchValues = async () => {
      setIsLoading(true);
      try {
        const values = await data.autocomplete.getValueSuggestions({
          indexPattern: {
            title: AGENT_LOG_INDEX_PATTERN,
            fields: [DATASET_FIELD],
          },
          field: DATASET_FIELD,
          query: '',
        });
        setDatasetValues(values.sort());
      } catch (e) {
        setDatasetValues([AGENT_DATASET]);
      }
      setIsLoading(false);
    };
    fetchValues();
  }, [data.autocomplete]);

  return (
    <EuiPopover
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOpen(true)}
          isSelected={isOpen}
          isLoading={isLoading}
          numFilters={datasetValues.length}
          hasActiveFilters={selectedDatasets.length > 0}
          numActiveFilters={selectedDatasets.length}
        >
          {i18n.translate('xpack.fleet.agentLogs.datasetSelectText', {
            defaultMessage: 'Dataset',
          })}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      {datasetValues.map((dataset) => (
        <EuiFilterSelectItem
          checked={selectedDatasets.includes(dataset) ? 'on' : undefined}
          key={dataset}
          onClick={() => onToggleDataset(dataset)}
        >
          {dataset}
        </EuiFilterSelectItem>
      ))}
    </EuiPopover>
  );
});
