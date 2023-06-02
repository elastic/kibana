/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataViewField, FieldSpec } from '@kbn/data-views-plugin/public';

import { useStartServices } from '../../../../../hooks';

import { AGENT_LOG_INDEX_PATTERN, DATASET_FIELD, AGENT_DATASET } from './constants';

export const DatasetFilter: React.FunctionComponent<{
  selectedDatasets: string[];
  onToggleDataset: (dataset: string) => void;
}> = memo(({ selectedDatasets, onToggleDataset }) => {
  const { unifiedSearch, data } = useStartServices();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [datasetValues, setDatasetValues] = useState<string[]>([AGENT_DATASET]);

  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), [setIsOpen]);
  const closePopover = useCallback(() => setIsOpen(false), [setIsOpen]);

  useEffect(() => {
    const fetchValues = async () => {
      setIsLoading(true);
      try {
        const fields: FieldSpec[] = await data.dataViews.getFieldsForWildcard({
          pattern: AGENT_LOG_INDEX_PATTERN,
        });
        const fieldsMap = fields.reduce((acc: Record<string, FieldSpec>, curr: FieldSpec) => {
          acc[curr.name] = curr;
          return acc;
        }, {});
        const newDataView = await data.dataViews.create({
          title: AGENT_LOG_INDEX_PATTERN,
          fields: fieldsMap,
        });

        const values = await unifiedSearch.autocomplete.getValueSuggestions({
          indexPattern: newDataView,
          field: DATASET_FIELD as DataViewField,
          query: '',
        });
        if (values.length > 0) setDatasetValues(values.sort());
      } catch (e) {
        setDatasetValues([AGENT_DATASET]);
      }
      setIsLoading(false);
    };
    fetchValues();
  }, [data.dataViews, unifiedSearch.autocomplete]);

  return (
    <EuiPopover
      button={
        <EuiFilterButton
          data-test-subj="agentList.datasetFilterBtn"
          iconType="arrowDown"
          onClick={togglePopover}
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
      closePopover={closePopover}
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
