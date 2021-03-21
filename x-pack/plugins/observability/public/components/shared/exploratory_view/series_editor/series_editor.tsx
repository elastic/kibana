/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { SeriesFilter } from './columns/series_filter';
import { ActionsCol } from './columns/actions_col';
import { Breakdowns } from './columns/breakdowns';
import { DataSeries } from '../types';
import { SeriesBuilder } from '../series_builder/series_builder';
import { NEW_SERIES_KEY, useUrlStorage } from '../hooks/use_url_strorage';
import { getDefaultConfigs } from '../configurations/default_configs';
import { DatePickerCol } from './columns/date_picker_col';
import { RemoveSeries } from './columns/remove_series';

export const SeriesEditor = () => {
  const { allSeries, firstSeriesId } = useUrlStorage();

  const columns = [
    {
      name: 'Name',
      field: 'id',
      width: '20%',
      render: (val: string) => (
        <EuiText>
          <EuiIcon type="dot" color="green" size="l" />{' '}
          {val === NEW_SERIES_KEY ? 'new-series-preview' : val}
        </EuiText>
      ),
    },
    ...(firstSeriesId !== NEW_SERIES_KEY
      ? [
          {
            name: 'Filter',
            field: 'defaultFilters',
            width: '20%',
            render: (defaultFilters: string[], series: DataSeries) => (
              <SeriesFilter defaultFilters={defaultFilters} seriesId={series.id} series={series} />
            ),
          },
          {
            name: 'Breakdowns',
            field: 'breakdowns',
            width: '15%',
            render: (val: string[], item: DataSeries) => (
              <Breakdowns seriesId={item.id} breakdowns={val} />
            ),
          },
          {
            name: '',
            align: 'center' as const,
            width: '15%',
            field: 'id',
            render: (val: string, item: DataSeries) => <ActionsCol series={item} />,
          },
        ]
      : []),
    {
      name: <div>Time</div>,
      width: '20%',
      field: 'id',
      align: 'right' as const,
      render: (val: string, item: DataSeries) => <DatePickerCol seriesId={item.id} />,
    },

    ...(firstSeriesId !== NEW_SERIES_KEY
      ? [
          {
            name: 'Actions',
            align: 'center' as const,
            width: '5%',
            field: 'id',
            render: (val: string, item: DataSeries) => <RemoveSeries series={item} />,
          },
        ]
      : []),
  ];

  const allSeriesKeys = Object.keys(allSeries);

  const items: DataSeries[] = [];
  allSeriesKeys.forEach((seriesKey) => {
    const series = allSeries[seriesKey];
    if (series.reportType) {
      items.push(
        getDefaultConfigs({
          reportType: series.reportType,
          seriesId: seriesKey,
        })
      );
    }
  });

  return (
    <>
      <EuiSpacer />
      <EuiBasicTable
        items={items}
        rowHeader="firstName"
        columns={columns}
        rowProps={() => (firstSeriesId === NEW_SERIES_KEY ? {} : { height: 100 })}
        noItemsMessage={'No series found, please add a series.'}
        cellProps={{
          style: {
            verticalAlign: 'top',
          },
        }}
      />
      <EuiSpacer />
      <SeriesBuilder />
    </>
  );
};
