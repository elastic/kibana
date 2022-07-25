/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Criteria,
  Direction,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableSortingType,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import {
  MetricsFetchDataResponse,
  MetricsFetchDataSeries,
  NumberOrNull,
  StringOrNull,
} from '../../../..';
import { SectionContainer } from '..';
import { getDataHandler } from '../../../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { useDatePickerContext } from '../../../../hooks/use_date_picker_context';
import { HostLink } from './host_link';
import { formatDuration } from './lib/format_duration';
import { MetricWithSparkline } from './metric_with_sparkline';
import { BucketSize } from '../../../../pages/overview';

const COLOR_ORANGE = 7;
const COLOR_BLUE = 1;
const COLOR_GREEN = 0;
const COLOR_PURPLE = 3;

interface Props {
  bucketSize: BucketSize;
}

const percentFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0[.0]%');

const numberFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0[.0]');

const bytesPerSecondFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0b') + '/s';

export function MetricsSection({ bucketSize }: Props) {
  const { forceUpdate, hasDataMap } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  const [sortField, setSortField] = useState<keyof MetricsFetchDataSeries>('uptime');
  const [sortedData, setSortedData] = useState<MetricsFetchDataResponse | null>(null);

  const { data, status } = useFetcher(() => {
    if (bucketSize && absoluteStart && absoluteEnd) {
      return getDataHandler('infra_metrics')?.fetchData({
        absoluteTime: { start: absoluteStart, end: absoluteEnd },
        relativeTime: { start: relativeStart, end: relativeEnd },
        ...bucketSize,
      });
    }
    // `forceUpdate` and `lastUpdated` should trigger a reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bucketSize,
    relativeStart,
    relativeEnd,
    absoluteStart,
    absoluteEnd,
    forceUpdate,
    lastUpdated,
  ]);

  const handleTableChange = useCallback(
    ({ sort }: Criteria<MetricsFetchDataSeries>) => {
      if (sort) {
        const { field, direction } = sort;
        setSortField(field);
        setSortDirection(direction);
        if (data) {
          (async () => {
            const response = await data.sort(field, direction);
            setSortedData(response || null);
          })();
        }
      }
    },
    [data, setSortField, setSortDirection]
  );

  if (!hasDataMap.infra_metrics?.hasData) {
    return null;
  }

  const isLoading = status === FETCH_STATUS.LOADING;
  const isPending = status === FETCH_STATUS.LOADING;
  if (isLoading || isPending) {
    return <pre>Loading</pre>;
  }

  if (!data) {
    return <pre>No Data</pre>;
  }

  const columns: Array<EuiBasicTableColumn<MetricsFetchDataSeries>> = [
    {
      field: 'uptime',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.uptime', {
        defaultMessage: 'Uptime',
      }),
      sortable: true,
      width: '80px',
      render: (value: NumberOrNull) => (value == null ? 'N/A' : formatDuration(value / 1000)),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.hostname', {
        defaultMessage: 'Hostname',
      }),
      sortable: true,
      truncateText: true,
      isExpander: true,
      textOnly: true,
      render: (value: StringOrNull, record: MetricsFetchDataSeries) => (
        <HostLink
          id={record.id}
          name={value}
          timerange={{ from: absoluteStart!, to: absoluteEnd! }}
        />
      ),
    },
    {
      field: 'cpu',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.cpu', {
        defaultMessage: 'CPU %',
      }),
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="cpu"
          value={value}
          formatter={percentFormatter}
          timeseries={record.timeseries}
          color={COLOR_ORANGE}
        />
      ),
    },
    {
      field: 'load',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.load15', {
        defaultMessage: 'Load 15',
      }),
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="load"
          value={value}
          formatter={numberFormatter}
          timeseries={record.timeseries}
          color={COLOR_BLUE}
        />
      ),
    },
    {
      field: 'rx',
      name: 'RX',
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="rx"
          value={value}
          formatter={bytesPerSecondFormatter}
          timeseries={record.timeseries}
          color={COLOR_GREEN}
        />
      ),
    },
    {
      field: 'tx',
      name: 'TX',
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="tx"
          value={value}
          formatter={bytesPerSecondFormatter}
          timeseries={record.timeseries}
          color={COLOR_PURPLE}
        />
      ),
    },
  ];

  const sorting: EuiTableSortingType<MetricsFetchDataSeries> = {
    sort: { field: sortField, direction: sortDirection },
  };

  const viewData = sortedData || data;

  const { appLink } = data || {};

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.metrics.title', {
        defaultMessage: 'Hosts',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.metrics.appLink', {
          defaultMessage: 'Show inventory',
        }),
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiBasicTable
        onChange={handleTableChange}
        sorting={sorting}
        items={viewData?.series ?? []}
        columns={columns}
      />
    </SectionContainer>
  );
}
