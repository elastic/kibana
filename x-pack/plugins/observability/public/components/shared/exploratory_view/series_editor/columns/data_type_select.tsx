/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { AppDataType } from '../../types';

interface Props {
  seriesId: string;
}
export const dataTypes: Array<{ id: AppDataType; label: string }> = [
  { id: 'synthetics', label: 'Synthetic Monitoring' },
  { id: 'ux', label: 'User Experience (RUM)' },
  { id: 'mobile', label: 'Mobile Experience' },
];

const SELECT_DATA_TYPE = 'SELECT_DATA_TYPE';

export function DataTypesSelect({ seriesId }: Props) {
  const { getSeries, setSeries, reportType } = useSeriesStorage();

  const series = getSeries(seriesId);

  const onDataTypeChange = (dataType: AppDataType) => {
    setSeries(seriesId, {
      ...series,
      dataType,
      reportDefinitions: {},
    });
  };

  const options = dataTypes
    .filter(({ id }) => {
      if (reportType === 'device-data-distribution') {
        return id === 'mobile';
      }
      if (reportType === 'core-web-vitals') {
        return id === 'ux';
      }
      return true;
    })
    .map(({ id, label }) => ({
      value: id,
      inputDisplay: label,
    }));

  return (
    <EuiSuperSelect
      fullWidth
      options={
        series.dataType
          ? options
          : [{ value: SELECT_DATA_TYPE, inputDisplay: 'Select data type' }, ...options]
      }
      valueOfSelected={series.dataType ?? SELECT_DATA_TYPE}
      onChange={(value) => onDataTypeChange(value as AppDataType)}
      style={{ minWidth: 220 }}
    />
  );
}
