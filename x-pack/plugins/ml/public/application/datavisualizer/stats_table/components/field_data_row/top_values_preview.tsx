/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiDataGridColumn } from '@elastic/eui';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ColumnChart } from '../../../../components/data_grid/column_chart';
import { ChartData } from '../../../../components/data_grid';
import { OrdinalDataItem } from '../../../../components/data_grid/use_column_chart';

export const TopValuesPreview: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;
  const { topValues, cardinality } = stats;
  if (cardinality === undefined || topValues === undefined || config.fieldName === undefined)
    return null;

  const data: OrdinalDataItem[] = topValues.map((d) => ({
    ...d,
    key: d.key.toString(),
  }));
  const chartData: ChartData = {
    cardinality,
    data,
    id: config.fieldName,
    type: 'ordinal',
  };
  const columnType: EuiDataGridColumn = {
    id: config.fieldName,
    schema: undefined,
  };
  return (
    <ColumnChart
      chartData={chartData}
      columnType={columnType}
      dataTestSubj={`mlDataGridChart-${config.fieldName}`}
      hideLabel={true}
      maxChartColumns={10}
    />
  );
};
