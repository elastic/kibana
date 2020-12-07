/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FieldDataCardProps } from '../../../index_based/components/field_data_card';
import { ColumnChart } from '../../../../components/data_grid/column_chart';

export const TopValuesPreview: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;
  const { topValues, cardinality } = stats;

  const chartData = {
    cardinality,
    data: topValues,
    id: config.fieldName,
    type: 'ordinal',
  };
  const columnType = {
    id: config.fieldName,
    schema: undefined,
  };
  return (
    <ColumnChart
      chartData={chartData}
      columnType={columnType}
      dataTestSubj={`mlDataGridChart-${config.fieldName}`}
      compressed={true}
    />
  );
};
