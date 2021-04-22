/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
// import { EuiDataGridColumn } from '@elastic/eui';
import { OrdinalChartData } from './field_histograms';
// import { ColumnChart } from '../../../../../../components/data_grid/column_chart'; // TODO copy component
import { FieldDataRowProps } from '../../types';
import { getTFPercentage } from '../../utils';

export const BooleanContentPreview: FC<FieldDataRowProps> = ({ config }) => {
  const chartData = useMemo(() => {
    const results = getTFPercentage(config);
    if (results) {
      const data = [
        { key: 'true', key_as_string: 'true', doc_count: results.trueCount },
        { key: 'false', key_as_string: 'false', doc_count: results.falseCount },
      ];
      return { id: config.fieldName, cardinality: 2, data, type: 'boolean' } as OrdinalChartData;
    }
  }, [config]);
  if (!chartData || config.fieldName === undefined) return null;

  // const columnType: EuiDataGridColumn = {
  //   id: config.fieldName,
  //   schema: undefined,
  // };
  // const dataTestSubj = `mlDataGridChart-${config.fieldName}`;

  return (
    <></>
    // <ColumnChart
    //   dataTestSubj={dataTestSubj}
    //   chartData={chartData}
    //   columnType={columnType}
    //   hideLabel={true}
    // />
  );
};
