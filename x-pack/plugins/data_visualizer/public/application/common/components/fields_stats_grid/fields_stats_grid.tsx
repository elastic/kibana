/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, FC, useState } from 'react';
import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import type { DataVisualizerTableState } from '../../../../../common/types';
import { DataVisualizerTable, ItemIdToExpandedRowMap } from '../stats_table';
import type { FileBasedFieldVisConfig } from '../../../../../common/types/field_vis_config';
import { FileBasedDataVisualizerExpandedRow } from '../expanded_row';

import { DataVisualizerFieldNamesFilter } from '../field_names_filter';
import { DataVisualizerFieldTypesFilter } from '../field_types_filter';
import { createFields } from './create_fields';
import { filterFields } from './filter_fields';
import { MetricFieldsCount, TotalFieldsCount } from '../stats_table/components/field_count_stats';

interface Props {
  results: FindFileStructureResponse;
}

export const getDefaultDataVisualizerListState = (): DataVisualizerTableState => ({
  pageIndex: 0,
  pageSize: 25,
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

  const [dataVisualizerListState, setDataVisualizerListState] =
    useState<DataVisualizerTableState>(restorableDefaults);

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
    [results]
  );
  const { filteredFields, visibleFieldsCount, visibleMetricsCount } = useMemo(
    () => filterFields(fields, visibleFieldNames, visibleFieldTypes),
    [fields, visibleFieldNames, visibleFieldTypes]
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
        data-test-subj="dataVisualizerFieldCountPanel"
      >
        <TotalFieldsCount fieldsCountStats={fieldsCountStats} />
        <MetricFieldsCount metricsStats={metricsStats} />

        <EuiFlexGroup
          gutterSize="xs"
          data-test-subj="dataVisualizerFieldCountPanel"
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
