/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefObject } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';
import { AppDataType, ReportViewTypeId, ReportViewTypes, SeriesUrl } from '../types';
import { DataTypesCol } from './columns/data_types_col';
import { ReportTypesCol } from './columns/report_types_col';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { ReportFilters } from './columns/report_filters';
import { ReportBreakdowns } from './columns/report_breakdowns';
import { NEW_SERIES_KEY, useSeriesStorage } from '../hooks/use_series_storage';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { getDefaultConfigs } from '../configurations/default_configs';

export const ReportTypes: Record<AppDataType, Array<{ id: ReportViewTypeId; label: string }>> = {
  synthetics: [
    { id: 'kpi', label: 'KPI over time' },
    { id: 'dist', label: 'Performance distribution' },
  ],
  ux: [
    { id: 'kpi', label: 'KPI over time' },
    { id: 'dist', label: 'Performance distribution' },
    { id: 'cwv', label: 'Core Web Vitals' },
  ],
  apm: [],
  infra_logs: [],
  infra_metrics: [],
};

export function SeriesBuilder({
  seriesBuilderRef,
  seriesId,
}: {
  seriesId: string;
  seriesBuilderRef: RefObject<HTMLDivElement>;
}) {
  const { getSeries, setSeries, removeSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const {
    dataType,
    seriesType,
    reportType,
    reportDefinitions = {},
    filters = [],
    operationType,
    breakdown,
    time,
  } = series;

  const { indexPattern, loading, hasData } = useAppIndexPatternContext();

  const getDataViewSeries = () => {
    return getDefaultConfigs({
      dataType,
      indexPattern,
      reportType: reportType!,
    });
  };

  const columns = [
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.dataType', {
        defaultMessage: 'Data Type',
      }),
      width: '15%',
      render: (val: string) => <DataTypesCol seriesId={seriesId} />,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.report', {
        defaultMessage: 'Report',
      }),
      width: '15%',
      render: (val: string) => (
        <ReportTypesCol seriesId={seriesId} reportTypes={dataType ? ReportTypes[dataType] : []} />
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.definition', {
        defaultMessage: 'Definition',
      }),
      width: '30%',
      render: (val: string) => {
        if (dataType && hasData) {
          return loading ? (
            LOADING_VIEW
          ) : reportType ? (
            <ReportDefinitionCol seriesId={seriesId} dataViewSeries={getDataViewSeries()} />
          ) : (
            SELECT_REPORT_TYPE
          );
        }

        return null;
      },
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.filters', {
        defaultMessage: 'Filters',
      }),
      width: '20%',
      render: (val: string) =>
        reportType && indexPattern ? (
          <ReportFilters seriesId={seriesId} dataViewSeries={getDataViewSeries()} />
        ) : null,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.breakdown', {
        defaultMessage: 'Breakdowns',
      }),
      width: '20%',
      field: 'id',
      render: (val: string) =>
        reportType && indexPattern ? (
          <ReportBreakdowns seriesId={seriesId} dataViewSeries={getDataViewSeries()} />
        ) : null,
    },
  ];

  // TODO: Remove this if remain unused during multiple series view
  // @ts-expect-error
  const addSeries = () => {
    if (reportType) {
      const newSeriesId = `${
        reportDefinitions?.['service.name'] ||
        reportDefinitions?.['monitor.id'] ||
        ReportViewTypes[reportType]
      }`;

      const newSeriesN: SeriesUrl = {
        dataType,
        time,
        filters,
        breakdown,
        reportType,
        seriesType,
        operationType,
        reportDefinitions,
      };

      setSeries(newSeriesId, newSeriesN);
      removeSeries(NEW_SERIES_KEY);
    }
  };

  const items = [{ id: seriesId }];

  return (
    <div ref={seriesBuilderRef}>
      <EuiBasicTable
        items={items as any}
        columns={columns}
        cellProps={{ style: { borderRight: '1px solid #d3dae6', verticalAlign: 'initial' } }}
        tableLayout="auto"
      />
    </div>
  );
}

export const LOADING_VIEW = i18n.translate(
  'xpack.observability.expView.seriesBuilder.loadingView',
  {
    defaultMessage: 'Loading view ...',
  }
);

export const SELECT_REPORT_TYPE = i18n.translate(
  'xpack.observability.expView.seriesBuilder.selectReportType',
  {
    defaultMessage: 'No report type selected',
  }
);
