/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButton, EuiBasicTable, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { AppDataType, ReportViewTypeId, ReportViewTypes, SeriesUrl, UrlFilter } from '../types';
import { DataTypesCol } from './columns/data_types_col';
import { ReportTypesCol } from './columns/report_types_col';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { ReportFilters } from './columns/report_filters';
import { ReportBreakdowns } from './columns/report_breakdowns';
import { NEW_SERIES_KEY, useUrlStorage } from '../hooks/use_url_strorage';

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

  const columns = [
    {
      name: 'DataType',
      width: '20%',
      render: (val: string) => <DataTypesCol />,
    },
    {
      name: 'Report',
      width: '20%',
      render: (val: string) => (
        <ReportTypesCol reportTypes={dataType ? ReportTypes[dataType] : []} />
      ),
    },
    {
      name: 'Definition',
      width: '30%',
      render: (val: string) => (reportType ? <ReportDefinitionCol /> : null),
    },
    {
      name: 'Filters',
      width: '25%',
      render: (val: string) => (reportType ? <ReportFilters reportType={reportType} /> : null),
    },
    {
      name: 'Breakdowns',
      width: '25%',
      field: 'id',
      render: (val: string) => (reportType ? <ReportBreakdowns /> : null),
    },
  ];

  const addSeries = () => {
    const getFiltersFromDefs = (): UrlFilter[] => {
      return Object.entries(reportDefinitions).map(([field, value]) => ({
        field,
        values: [value],
      }));
    };

    if (reportType) {
      const newSeriesId = `${
        reportDefinitions?.['service.name'] ||
        reportDefinitions?.['monitor.id'] ||
        ReportViewTypes[reportType]
      }`;

      const newSeriesN = {
        reportType,
        time: { from: 'now-30m', to: 'now' },
        filters: getFiltersFromDefs().concat(filters),
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
              Add
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="cross"
              color="danger"
              onClick={() => {
                removeSeries(NEW_SERIES_KEY);
                setIsFlyoutVisible(false);
              }}
            >
              Cancel
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
            {'Add series'}
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
