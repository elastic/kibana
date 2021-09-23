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
import { SeriesConfig } from '../types';
import { NEW_SERIES_KEY, useSeriesStorage } from '../hooks/use_series_storage';
import { getDefaultConfigs } from '../configurations/default_configs';
import { DatePickerCol } from './columns/date_picker_col';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { SeriesActions } from './columns/series_actions';
import { ChartEditOptions } from './chart_edit_options';

interface EditItem {
  seriesConfig: SeriesConfig;
  id: string;
}

export function SeriesEditor() {
  const { allSeries, allSeriesIds } = useSeriesStorage();

  const columns = [
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.name', {
        defaultMessage: 'Name',
      }),
      field: 'id',
      width: '15%',
      render: (seriesId: string) => (
        <EuiText>
          <EuiIcon type="dot" color="green" size="l" />{' '}
          {seriesId === NEW_SERIES_KEY ? 'series-preview' : seriesId}
        </EuiText>
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.filters', {
        defaultMessage: 'Filters',
      }),
      field: 'defaultFilters',
      width: '15%',
      render: (seriesId: string, { seriesConfig, id }: EditItem) => (
        <SeriesFilter
          filterFields={seriesConfig.filterFields}
          seriesId={id}
          seriesConfig={seriesConfig}
          baseFilters={seriesConfig.baseFilters}
        />
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.breakdowns', {
        defaultMessage: 'Breakdowns',
      }),
      field: 'id',
      width: '25%',
      render: (seriesId: string, { seriesConfig, id }: EditItem) => (
        <ChartEditOptions
          seriesId={id}
          breakdownFields={seriesConfig.breakdownFields}
          seriesConfig={seriesConfig}
        />
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
      render: (seriesId: string, item: EditItem) => <DatePickerCol seriesId={seriesId} />,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.actions', {
        defaultMessage: 'Actions',
      }),
      align: 'center' as const,
      width: '10%',
      field: 'id',
      render: (seriesId: string, item: EditItem) => <SeriesActions seriesId={seriesId} />,
    },
  ];

  const { indexPatterns } = useAppIndexPatternContext();
  const items: EditItem[] = [];

  allSeriesIds.forEach((seriesKey) => {
    const series = allSeries[seriesKey];
    if (series?.reportType && indexPatterns[series.dataType] && !series.isNew) {
      items.push({
        id: seriesKey,
        seriesConfig: getDefaultConfigs({
          indexPattern: indexPatterns[series.dataType],
          reportType: series.reportType,
          dataType: series.dataType,
        }),
      });
    }
  });

  if (items.length === 0 && allSeriesIds.length > 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiBasicTable
        items={items}
        rowHeader="firstName"
        columns={columns}
        noItemsMessage={i18n.translate('xpack.observability.expView.seriesEditor.seriesNotFound', {
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
