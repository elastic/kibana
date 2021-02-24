/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, FC } from 'react';
import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import type { FindFileStructureResponse } from '../../../../../../common/types/file_datavisualizer';
import { DataVisualizerTable, ItemIdToExpandedRowMap } from '../../../stats_table';
import type { FileBasedFieldVisConfig } from '../../../stats_table/types/field_vis_config';
import { FileBasedDataVisualizerExpandedRow } from '../expanded_row';

import { DataVisualizerFieldNamesFilter } from '../field_names_filter';
import { DataVisualizerFieldTypesFilter } from '../field_types_filter';
import { createFields } from './create_fields';
import { filterFields } from './filter_fields';
import { usePageUrlState } from '../../../../util/url_state';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import {
  MetricFieldsCount,
  TotalFieldsCount,
} from '../../../stats_table/components/field_count_stats';
import type { DataVisualizerFileBasedAppState } from '../../../../../../common/types/ml_url_generator';

interface Props {
  results: FindFileStructureResponse;
}
export const getDefaultDataVisualizerListState = (): Required<DataVisualizerFileBasedAppState> => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'fieldName',
  sortDirection: 'asc',
  visibleFieldTypes: [],
  visibleFieldNames: [],
  showDistributions: true,
});

function getItemIdToExpandedRowMap(
  itemIds: string[],
  items: FileBasedFieldVisConfig[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, fieldName: string) => {
    const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
    if (item !== undefined) {
      m[fieldName] = <FileBasedDataVisualizerExpandedRow item={item} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

export const FieldsStatsGrid: FC<Props> = ({ results }) => {
  const restorableDefaults = getDefaultDataVisualizerListState();
  const [
    dataVisualizerListState,
    setDataVisualizerListState,
  ] = usePageUrlState<DataVisualizerFileBasedAppState>(
    ML_PAGES.DATA_VISUALIZER_FILE,
    restorableDefaults
  );
  const visibleFieldTypes =
    dataVisualizerListState.visibleFieldTypes ?? restorableDefaults.visibleFieldTypes;
  const setVisibleFieldTypes = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldTypes: values });
  };

  const visibleFieldNames =
    dataVisualizerListState.visibleFieldNames ?? restorableDefaults.visibleFieldNames;
  const setVisibleFieldNames = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldNames: values });
  };

  const { fields, totalFieldsCount, totalMetricFieldsCount } = useMemo(
    () => createFields(results),
    [results, visibleFieldNames, visibleFieldTypes]
  );
  const { filteredFields, visibleFieldsCount, visibleMetricsCount } = useMemo(
    () => filterFields(fields, visibleFieldNames, visibleFieldTypes),
    [results, visibleFieldNames, visibleFieldTypes]
  );

  const fieldsCountStats = { visibleFieldsCount, totalFieldsCount };
  const metricsStats = { visibleMetricsCount, totalMetricFieldsCount };

  return (
    <div>
      <EuiSpacer size="m" />

      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        style={{ marginLeft: 4 }}
        data-test-subj="mlDataVisualizerFieldCountPanel"
      >
        <TotalFieldsCount fieldsCountStats={fieldsCountStats} />
        <MetricFieldsCount metricsStats={metricsStats} />

        <EuiFlexGroup
          gutterSize="xs"
          data-test-subj="mlDataVisualizerFieldCountPanel"
          justifyContent={'flexEnd'}
        >
          <DataVisualizerFieldNamesFilter
            fields={fields}
            setVisibleFieldNames={setVisibleFieldNames}
            visibleFieldNames={visibleFieldNames}
          />
          <DataVisualizerFieldTypesFilter
            fields={fields}
            setVisibleFieldTypes={setVisibleFieldTypes}
            visibleFieldTypes={visibleFieldTypes}
          />
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DataVisualizerTable<FileBasedFieldVisConfig>
        items={filteredFields}
        pageState={dataVisualizerListState}
        updatePageState={setDataVisualizerListState}
        getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
      />
    </div>
  );
};
