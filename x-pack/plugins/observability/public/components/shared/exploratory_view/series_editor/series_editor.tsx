/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SeriesFilter } from './columns/series_filter';
import { DataSeries } from '../types';
import { NEW_SERIES_KEY, useUrlStorage } from '../hooks/use_url_storage';
import { getDefaultConfigs } from '../configurations/default_configs';
import { DatePickerCol } from './columns/date_picker_col';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { SeriesActions } from './columns/series_actions';
import { ChartEditOptions } from './chart_edit_options';

export function SeriesEditor() {
  const { allSeries, firstSeriesId } = useUrlStorage();

  const columns = [
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.name', {
        defaultMessage: 'Name',
      }),
      field: 'id',
      width: '15%',
      render: (val: string) => (
        <EuiText>
          <EuiIcon type="dot" color="green" size="l" />{' '}
          {val === NEW_SERIES_KEY ? 'series-preview' : val}
        </EuiText>
      ),
    },
    ...(firstSeriesId !== NEW_SERIES_KEY
      ? [
          {
            name: i18n.translate('xpack.observability.expView.seriesEditor.filters', {
              defaultMessage: 'Filters',
            }),
            field: 'defaultFilters',
            width: '15%',
            render: (defaultFilters: string[], series: DataSeries) => (
              <SeriesFilter defaultFilters={defaultFilters} seriesId={series.id} series={series} />
            ),
          },
          {
            name: i18n.translate('xpack.observability.expView.seriesEditor.breakdowns', {
              defaultMessage: 'Breakdowns',
            }),
            field: 'breakdowns',
            width: '25%',
            render: (val: string[], item: DataSeries) => (
              <ChartEditOptions seriesId={item.id} breakdowns={val} series={item} />
            ),
          },
          {
            name: (
              <div>
                <FormattedMessage
                  id="xpack.observability.expView.seriesEditor.time"
                  defaultMessage="Time"
                />
              </div>
            ),
            width: '20%',
            field: 'id',
            align: 'right' as const,
            render: (val: string, item: DataSeries) => <DatePickerCol seriesId={item.id} />,
          },
          {
            name: i18n.translate('xpack.observability.expView.seriesEditor.actions', {
              defaultMessage: 'Actions',
            }),
            align: 'center' as const,
            width: '10%',
            field: 'id',
            render: (val: string, item: DataSeries) => <SeriesActions seriesId={item.id} />,
          },
        ]
      : []),
  ];

  const allSeriesKeys = Object.keys(allSeries);

  const items: DataSeries[] = [];

  const { indexPattern } = useAppIndexPatternContext();

  allSeriesKeys.forEach((seriesKey) => {
    const series = allSeries[seriesKey];
    if (series.reportType && indexPattern) {
      items.push(
        getDefaultConfigs({
          indexPattern,
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
        noItemsMessage={i18n.translate('xpack.observability.expView.seriesEditor.notFound', {
          defaultMessage: 'No series found, please add a series.',
        })}
        cellProps={{
          style: {
            verticalAlign: 'top',
          },
        }}
        tableLayout="auto"
      />
      <EuiSpacer />
    </>
  );
}
