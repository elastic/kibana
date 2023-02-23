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
  EuiLoadingChart,
  EuiTableSortingType,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { useFetchInfraMetrics } from '../../../../hooks/overview/use_fetch_infra_metrics';
import { useFetchInfraMetricsHasData } from '../../../../hooks/overview/use_fetch_infra_metrics_has_data';
import {
  MetricsFetchDataResponse,
  MetricsFetchDataSeries,
  NumberOrNull,
  StringOrNull,
} from '../../../..';
import { SectionContainer } from '..';
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

export function MetricsSection({ bucketSize }: Props) {
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  const [sortField, setSortField] = useState<keyof MetricsFetchDataSeries>('uptime');
  const [sortedData, setSortedData] = useState<MetricsFetchDataResponse | null>(null);

  const { data } = useFetchInfraMetricsHasData();

  const { metrics, isLoading, isError } = useFetchInfraMetrics({
    absoluteStart,
    absoluteEnd,
    hasData: Boolean(data?.hasData),
    relativeStart,
    relativeEnd,
    bucketSize,
    lastUpdated,
  });

  const { appLink } = metrics || {};

  const handleTableChange = useCallback(
    ({ sort }: Criteria<MetricsFetchDataSeries>) => {
      if (sort) {
        const { field, direction } = sort;
        setSortField(field);
        setSortDirection(direction);
        if (metrics) {
          (async () => {
            const response = await metrics.sort(field, direction);
            setSortedData(response || null);
          })();
        }
      }
    },
    [metrics, setSortField, setSortDirection]
  );

  if (!data?.hasData) {
    return null;
  }

  const isInitialLoad = isLoading && !data;

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

  const viewData = sortedData || metrics;

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
      hasError={isError}
    >
      {isInitialLoad ? (
        <div
          data-test-subj="loading"
          style={{
            height: 240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiLoadingChart size="l" />
        </div>
      ) : (
        <EuiBasicTable
          onChange={handleTableChange}
          sorting={sorting}
          items={viewData?.series ?? []}
          columns={columns}
          loading={isLoading}
        />
      )}
    </SectionContainer>
  );
}

const percentFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0[.0]%');

const numberFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0[.0]');

const bytesPerSecondFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0b') + '/s';
