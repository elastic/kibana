/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiBasicTable, EuiButton, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { SeriesFilter } from './columns/series_filter';
import { ActionsCol } from './columns/actions_col';
import { Breakdowns } from './columns/breakdowns';
import { DataSeries, DataViewType } from '../types';
import { getDefaultConfigs } from '../configurations/default_configs';

export const SeriesEditor = () => {
  const columns = [
    {
      name: 'Name',
      field: 'name',
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
      render: (defaultFilters: string[]) => <SeriesFilter defaultFilters={defaultFilters} />,
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
  ];

  const { dataViewType } = useParams<{ dataViewType: DataViewType }>();

  const items: DataSeries[] = [getDefaultConfigs({ dataViewType })];

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
      <EuiButton iconType="plus" color="secondary">
        Add series
      </EuiButton>
    </>
  );
};
