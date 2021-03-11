/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButton, EuiBasicTable, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { AppDataType, SeriesUrl } from '../types';
import { DataTypesCol } from './columns/data_types_col';
import { ReportTypesCol } from './columns/report_types_col';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { ReportFilters } from './columns/report_filters';
import { ReportBreakdowns } from './columns/report_breakdowns';
import { useUrlStorage } from '../hooks/use_url_strorage';

export const ReportTypes = {
  synthetics: ['Monitor duration', 'Pings histogram'],
  rum: ['Performance distribution', 'Page views', 'KPI over time'],
  apm: ['Latency', 'Throughput'],
  logs: [],
  metrics: [],
};

export const SeriesBuilder = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const [dataType, setDataType] = useState<AppDataType | null>(null);
  const [reportType, setReportType] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState<string | null>(null);

  const columns = [
    {
      name: 'DataType',
      field: 'dataType',
      width: '20%',
      render: (val: string) => <DataTypesCol selectedDataType={dataType} onChange={setDataType} />,
    },
    {
      name: 'Report',
      field: 'defaultFilters',
      width: '30%',
      render: (val: string) => (
        <ReportTypesCol
          selectedReportType={reportType}
          reportTypes={dataType ? ReportTypes[dataType] : []}
          onChange={setReportType}
        />
      ),
    },
    {
      name: 'Definition',
      field: 'defaultFilters',
      width: '30%',
      render: (val: string) =>
        reportType ? (
          <ReportDefinitionCol
            reportType={reportType}
            selectedServiceName={serviceName}
            onChange={setServiceName}
          />
        ) : null,
    },
    {
      name: 'Filters',
      field: 'filters',
      width: '25%',
      render: (val: string[]) => (reportType ? <ReportFilters /> : null),
    },
    {
      name: 'Breakdowns',
      width: '25%',
      field: 'id',
      render: (val: string[]) => (reportType ? <ReportBreakdowns /> : null),
    },
  ];

  const { setSeries, allSeriesIds } = useUrlStorage();

  const addSeries = () => {
    const newSeriesId = `${serviceName!}-pd`;

    const newSeries = { reportType: 'pd', serviceName } as SeriesUrl;
    setSeries(newSeriesId, newSeries);

    // reset state
    setDataType(null);
    setReportType(null);
    setServiceName(null);
    setIsFlyoutVisible(false);
  };

  const items = [{ dataTypes: ['APM'] }];

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <BottomFlyout aria-labelledby="flyoutTitle">
        <EuiBasicTable
          items={items}
          columns={columns}
          cellProps={{ style: { borderRight: '1px solid #d3dae6' } }}
        />
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plus" color="primary" disabled={!serviceName} onClick={addSeries}>
              Add
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="cross" color="danger">
              Cancel
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </BottomFlyout>
    );
  }

  return (
    <div>
      <EuiButton
        iconType={isFlyoutVisible ? 'arrowDown' : 'arrowRight'}
        color="secondary"
        iconSide="right"
        onClick={() => setIsFlyoutVisible((prevState) => !prevState)}
        disabled={allSeriesIds.length > 0}
      >
        {'Add series'}
      </EuiButton>
      <EuiSpacer />
      {flyout}
    </div>
  );
};

const BottomFlyout = styled.div`
  height: 300px;
`;
