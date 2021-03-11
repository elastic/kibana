/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiBasicTable, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { SeriesFilter } from './columns/series_filter';
import { ActionsCol } from './columns/actions_col';
import { Breakdowns } from './columns/breakdowns';
import { DataSeries, DataViewType } from '../types';
import { SeriesBuilder } from '../series_builder/series_builder';
import { useUrlStorage } from '../hooks/use_url_strorage';
import { getPageLoadDistLensConfig } from '../configurations/page_load_dist_config';
import { RemoveSeries } from './columns/remove_series';

export const SeriesEditor = () => {
  const columns = [
    {
      name: 'Name',
      field: 'id',
      width: '20%',
      render: (val: string) => (
        <EuiText>
          <EuiIcon type="dot" color="green" size="l" /> {val}
        </EuiText>
      ),
    },
    {
      name: 'Filter',
      field: 'defaultFilters',
      width: '30%',
      render: (defaultFilters: string[], series: DataSeries) => (
        <SeriesFilter defaultFilters={defaultFilters} seriesId={series.id} />
      ),
    },
    {
      name: 'Breakdowns',
      field: 'breakdowns',
      width: '25%',
      render: (val: string[], item: DataSeries) => (
        <Breakdowns seriesId={item.id} breakdowns={val} />
      ),
    },
    {
      name: 'Time',
      width: '25%',
      field: 'id',
      render: (val: string, item: DataSeries) => <ActionsCol series={item} />,
    },
    {
      name: 'Remove',
      width: '5%',
      field: 'id',
      render: (val: string, item: DataSeries) => <RemoveSeries series={item} />,
    },
  ];

  const { dataViewType } = useParams<{ dataViewType: DataViewType }>();

  const { allSeries } = useUrlStorage();

  console.log(allSeries);

  const allSeriesKeys = Object.keys(allSeries);

  const items: DataSeries[] = allSeriesKeys.map((seriesKey) => {
    const series = allSeries[seriesKey];
    return getPageLoadDistLensConfig({
      seriesId: seriesKey,
      serviceName: series.serviceName,
    });
  });

  return (
    <>
      <EuiSpacer />
      <EuiBasicTable
        items={items}
        rowHeader="firstName"
        columns={columns}
        rowProps={() => ({ height: 100 })}
      />
      <EuiSpacer />
      <SeriesBuilder />
    </>
  );
};
