/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { AppDataType, SeriesUrl } from '../../types';
import { DataTypes, ReportTypes } from '../../configurations/constants';

interface Props {
  seriesId: string;
  series: SeriesUrl;
}
export const dataTypes: Array<{ id: AppDataType; label: string }> = [
  { id: DataTypes.SYNTHETICS, label: 'Synthetic Monitoring' },
  { id: DataTypes.UX, label: 'User Experience (RUM)' },
  { id: DataTypes.MOBILE, label: 'Mobile Experience' },
];

const SELECT_DATA_TYPE = 'SELECT_DATA_TYPE';

export function DataTypesSelect({ seriesId, series }: Props) {
  const { setSeries, reportType } = useSeriesStorage();

  const onDataTypeChange = (dataType: AppDataType) => {
    setSeries(seriesId, {
      ...series,
      dataType,
      reportDefinitions: {},
    });
  };

  const options = dataTypes
    .filter(({ id }) => {
      if (reportType === ReportTypes.DEVICE_DISTRIBUTION) {
        return id === DataTypes.MOBILE;
      }
      if (reportType === ReportTypes.CORE_WEB_VITAL) {
        return id === DataTypes.UX;
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
          : [{ value: SELECT_DATA_TYPE, inputDisplay: SELECT_DATA_TYPE_LABEL }, ...options]
      }
      valueOfSelected={series.dataType ?? SELECT_DATA_TYPE}
      onChange={(value) => onDataTypeChange(value as AppDataType)}
      style={{ minWidth: 220 }}
    />
  );
}

const SELECT_DATA_TYPE_LABEL = i18n.translate(
  'xpack.observability.overview.exploratoryView.selectDataType',
  {
    defaultMessage: 'Select data type',
  }
);
