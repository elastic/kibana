/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiButton, EuiBasicTable, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { AppDataType, ReportViewTypeId, ReportViewTypes, SeriesUrl } from '../types';
import { DataTypesCol } from './columns/data_types_col';
import { ReportTypesCol } from './columns/report_types_col';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { ReportFilters } from './columns/report_filters';
import { ReportBreakdowns } from './columns/report_breakdowns';
import { NEW_SERIES_KEY, useUrlStorage } from '../hooks/use_url_strorage';
import { useIndexPatternContext } from '../hooks/use_default_index_pattern';
import { getDefaultConfigs } from '../configurations/default_configs';

export const ReportTypes: Record<AppDataType, Array<{ id: ReportViewTypeId; label: string }>> = {
  synthetics: [
    { id: 'upd', label: 'Monitor duration' },
    { id: 'upp', label: 'Pings histogram' },
  ],
  rum: [
    { id: 'pld', label: 'Performance distribution' },
    { id: 'kpi', label: 'KPI over time' },
  ],
  apm: [
    { id: 'svl', label: 'Latency' },
    { id: 'tpt', label: 'Throughput' },
  ],
  logs: [
    {
      id: 'logs',
      label: 'Logs Frequency',
    },
  ],
  metrics: [
    { id: 'cpu', label: 'CPU usage' },
    { id: 'mem', label: 'Memory usage' },
    { id: 'nwk', label: 'Network activity' },
  ],
};

export function SeriesBuilder() {
  const { series, setSeries, allSeriesIds, removeSeries } = useUrlStorage(NEW_SERIES_KEY);

  const { dataType, reportType, reportDefinitions = {}, filters = [] } = series;

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(!!series.dataType);

  const { indexPattern } = useIndexPatternContext();

  const getDataViewSeries = () => {
    return getDefaultConfigs({
      indexPattern,
      reportType: reportType!,
      seriesId: NEW_SERIES_KEY,
    });
  };

  const columns = [
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.dataType', {
        defaultMessage: 'Data Type',
      }),
      width: '20%',
      render: (val: string) => <DataTypesCol />,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.report', {
        defaultMessage: 'Report',
      }),
      width: '20%',
      render: (val: string) => (
        <ReportTypesCol reportTypes={dataType ? ReportTypes[dataType] : []} />
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.definition', {
        defaultMessage: 'Definition',
      }),
      width: '30%',
      render: (val: string) =>
        reportType && indexPattern ? (
          <ReportDefinitionCol dataViewSeries={getDataViewSeries()} />
        ) : null,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.filters', {
        defaultMessage: 'Filters',
      }),
      width: '25%',
      render: (val: string) =>
        reportType && indexPattern ? <ReportFilters dataViewSeries={getDataViewSeries()} /> : null,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.breakdown', {
        defaultMessage: 'Breakdowns',
      }),
      width: '25%',
      field: 'id',
      render: (val: string) =>
        reportType && indexPattern ? (
          <ReportBreakdowns dataViewSeries={getDataViewSeries()} />
        ) : null,
    },
  ];

  const addSeries = () => {
    if (reportType) {
      const newSeriesId = `${
        reportDefinitions?.['service.name'] ||
        reportDefinitions?.['monitor.id'] ||
        ReportViewTypes[reportType]
      }`;

      const newSeriesN = {
        reportType,
        time: { from: 'now-30m', to: 'now' },
        filters,
        reportDefinitions,
      } as SeriesUrl;

      setSeries(newSeriesId, newSeriesN).then(() => {
        removeSeries(NEW_SERIES_KEY);
        setIsFlyoutVisible(false);
      });
    }
  };

  const items = [{ id: NEW_SERIES_KEY }];

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <BottomFlyout aria-labelledby="flyoutTitle">
        <EuiBasicTable
          items={items as any}
          columns={columns}
          cellProps={{ style: { borderRight: '1px solid #d3dae6' } }}
        />
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plus" color="primary" onClick={addSeries}>
              {i18n.translate('xpack.observability.expView.seriesBuilder.add', {
                defaultMessage: 'Add',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="cross"
              color="text"
              onClick={() => {
                removeSeries(NEW_SERIES_KEY);
                setIsFlyoutVisible(false);
              }}
            >
              {i18n.translate('xpack.observability.expView.seriesBuilder.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </BottomFlyout>
    );
  }

  return (
    <div>
      {!isFlyoutVisible && (
        <>
          <EuiButton
            iconType={isFlyoutVisible ? 'arrowDown' : 'arrowRight'}
            color="primary"
            iconSide="right"
            onClick={() => setIsFlyoutVisible((prevState) => !prevState)}
            disabled={allSeriesIds.length > 0}
          >
            {i18n.translate('xpack.observability.expView.seriesBuilder.addSeries', {
              defaultMessage: 'Add series',
            })}
          </EuiButton>
          <EuiSpacer />
        </>
      )}
      {flyout}
    </div>
  );
}

const BottomFlyout = styled.div`
  height: 300px;
`;
