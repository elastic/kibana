/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { EuiBasicTable, EuiSpacer, EuiText } from '@elastic/eui';
import { SeriesFilter } from './columns/series_filter';
import { SeriesConfig, SeriesUrl } from '../types';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { getDefaultConfigs } from '../configurations/default_configs';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { SeriesInfo } from './columns/series_info';
import { SeriesDatePicker } from '../components/series_date_picker';
import { NO_BREAK_DOWN_LABEL } from './columns/breakdowns';

interface EditItem {
  id: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}

export function SeriesViewer() {
  const { allSeries, reportType } = useSeriesStorage();

  const columns = [
    {
      name: '',
      field: 'id',
      width: '10%',
      render: (seriesId: number, { seriesConfig, series }: EditItem) => (
        <SeriesInfo seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.name', {
        defaultMessage: 'Name',
      }),
      field: 'id',
      width: '15%',
      render: (seriesId: number, { series }: EditItem) => <EuiText>{series.name}</EuiText>,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.filters', {
        defaultMessage: 'Filters',
      }),
      field: 'id',
      width: '35%',
      render: (seriesId: number, { series, seriesConfig }: EditItem) => (
        <SeriesFilter seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.breakdownBy', {
        defaultMessage: 'Breakdown by',
      }),
      field: 'seriesId',
      width: '10%',
      render: (seriesId: number, { seriesConfig: { labels }, series }: EditItem) => (
        <EuiText>{series.breakdown ? labels[series.breakdown] : NO_BREAK_DOWN_LABEL}</EuiText>
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.time', {
        defaultMessage: 'Time',
      }),
      width: '30%',
      field: 'id',
      render: (seriesId: number, { series }: EditItem) => (
        <SeriesDatePicker seriesId={seriesId} series={series} readonly={true} />
      ),
    },
  ];

  const { indexPatterns } = useAppIndexPatternContext();
  const items: EditItem[] = [];

  allSeries.forEach((series, seriesIndex) => {
    if (indexPatterns[series.dataType] && !isEmpty(series.reportDefinitions)) {
      items.push({
        series,
        id: seriesIndex,
        seriesConfig: getDefaultConfigs({
          reportType,
          dataType: series.dataType,
          indexPattern: indexPatterns[series.dataType],
        }),
      });
    }
  });

  if (items.length === 0 && allSeries.length > 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiBasicTable
        items={items}
        rowHeader="firstName"
        columns={columns}
        noItemsMessage={i18n.translate('xpack.observability.expView.seriesEditor.notFound', {
          defaultMessage: 'No series found. Please add a series.',
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
