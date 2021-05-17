/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { SeriesFilter } from '../../series_editor/columns/series_filter';
import { DataSeries } from '../../types';
import { useUrlStorage } from '../../hooks/use_url_storage';

export function ReportFilters({
  dataViewSeries,
  seriesId,
}: {
  dataViewSeries: DataSeries;
  seriesId: string;
}) {
  const options = [
    {
      value: '1d',
      inputDisplay: '1 day ago',
      dropdownDisplay: '1 day ago',
    },
    {
      value: '1h',
      inputDisplay: '1 hour ago',
      dropdownDisplay: '1 hour ago',
    },
  ];

  const { setSeries, series } = useUrlStorage(seriesId);

  return (
    <>
      <EuiSuperSelect
        fullWidth
        compressed
        prepend={'Compare'}
        valueOfSelected={'1d'}
        options={options}
        onChange={(val) => {
          setSeries(seriesId, { ...series, compareTo: val });
        }}
      />
      <SeriesFilter
        series={dataViewSeries}
        defaultFilters={dataViewSeries.defaultFilters}
        seriesId={seriesId}
        isNew={true}
      />
    </>
  );
}
