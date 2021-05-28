/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiDataGridColumn } from '@elastic/eui';
import { ChartData, OrdinalDataItem } from './field_histograms';
import { ColumnChart } from './column_chart';
import type { FieldDataRowProps } from '../../types/field_data_row';

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
