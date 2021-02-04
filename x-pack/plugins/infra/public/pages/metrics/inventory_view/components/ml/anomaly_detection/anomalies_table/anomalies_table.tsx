/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTableHeader, EuiTableHeaderCell, EuiTableBody } from '@elastic/eui';
import { EuiTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import DateMath from '@elastic/datemath';
import { EuiSuperDatePicker } from '@elastic/eui';
import { EuiTableRow } from '@elastic/eui';
import { EuiTableRowCell } from '@elastic/eui';
import moment from 'moment';
import { EuiButtonGroup } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiFieldSearch } from '@elastic/eui';
import { useMetricsK8sAnomaliesResults } from '../../../../hooks/use_metrics_k8s_anomalies';
import { useMetricsHostsAnomaliesResults } from '../../../../hooks/use_metrics_hosts_anomalies';
import {
  MetricsHostsAnomaly,
  Sort,
} from '../../../../../../../../common/http_api/infra_ml/results';
import { PaginationControls } from './pagination';
import { AnomalySummary } from './annomaly_summary';
import { AnomalySeverityIndicator } from '../../../../../../../components/logging/log_analysis_results/anomaly_severity_indicator';

type JobType = 'k8s' | 'hosts';
type SortField = 'anomalyScore' | 'startTime';
type SortDir = 'desc' | 'asc';
export const AnomaliesTable = () => {
  const [search, setSearch] = useState('');
  const [start, setStart] = useState('now-30d');
  const [end, setEnd] = useState('now');
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>(
    stringToNumericTimeRange({
      start,
      end,
    })
  );
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [jobType, setJobType] = useState<JobType>('hosts');

  const onTimeChange = useCallback(({ start: s, end: e }) => {
    setStart(s);
    setEnd(e);
    setTimeRange(stringToNumericTimeRange({ start: s, end: e }));
  }, []);

  const anomalyParams = useMemo(
    () => ({
      sourceId: 'default',
      startTime: timeRange.start,
      endTime: timeRange.end,
      defaultSortOptions: {
        direction: sortDir,
        field: sortField,
      },
      defaultPaginationOptions: { pageSize: 10 },
    }),
    [timeRange, sortField, sortDir]
  );

  const {
    metricsHostsAnomalies,
    getMetricsHostsAnomalies,
    page: hostPage,
    changeSortOptions: hostChangeSort,
    fetchNextPage: hostFetchNextPage,
    fetchPreviousPage: hostFetchPrevPage,
    isLoadingMetricsHostsAnomalies: hostLoading,
  } = useMetricsHostsAnomaliesResults(anomalyParams);
  const {
    metricsK8sAnomalies,
    getMetricsK8sAnomalies,
    page: k8sPage,
    changeSortOptions: k8sChangeSort,
    fetchNextPage: k8sFetchNextPage,
    fetchPreviousPage: k8sPreviousPage,
    isLoadingMetricsK8sAnomalies: k8sLoading,
  } = useMetricsK8sAnomaliesResults(anomalyParams);

  const page = useMemo(() => (jobType === 'hosts' ? hostPage : k8sPage), [
    jobType,
    hostPage,
    k8sPage,
  ]);
  const isLoading = useMemo(() => (jobType === 'hosts' ? hostLoading : k8sLoading), [
    jobType,
    hostLoading,
    k8sLoading,
  ]);
  const fetchNextPage = useMemo(
    () => (jobType === 'hosts' ? hostFetchNextPage : k8sFetchNextPage),
    [jobType, hostFetchNextPage, k8sFetchNextPage]
  );
  const fetchPreviousPage = useMemo(
    () => (jobType === 'hosts' ? hostFetchPrevPage : k8sPreviousPage),
    [jobType, hostFetchPrevPage, k8sPreviousPage]
  );

  const getAnomalies = useMemo(() => {
    if (jobType === 'hosts') {
      return getMetricsHostsAnomalies;
    } else if (jobType === 'k8s') {
      return getMetricsK8sAnomalies;
    }
  }, [jobType, getMetricsK8sAnomalies, getMetricsHostsAnomalies]);

  const results = useMemo(() => {
    if (jobType === 'hosts') {
      return metricsHostsAnomalies;
    } else {
      return metricsK8sAnomalies;
    }
  }, [jobType, metricsHostsAnomalies, metricsK8sAnomalies]);

  const onSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const changeJobType = useCallback((type: string) => {
    setJobType(type as JobType);
  }, []);

  const changeSortOptions = useCallback(
    (nextSortOptions: Sort) => {
      if (jobType === 'hosts') {
        hostChangeSort(nextSortOptions);
      } else {
        k8sChangeSort(nextSortOptions);
      }
    },
    [hostChangeSort, k8sChangeSort, jobType]
  );

  useEffect(() => {
    if (getAnomalies) {
      getAnomalies();
    }
  }, [getAnomalies]);

  const toggleButtons = [
    {
      id: `hosts`,
      label: i18n.translate('xpack.infra.ml.anomalyFlyout.hostBtn', {
        defaultMessage: 'Hosts',
      }),
    },
    {
      id: `k8s`,
      label: i18n.translate('xpack.infra.ml.anomalyFlyout.podsBtn', {
        defaultMessage: 'Pods',
      }),
    },
  ];

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            showUpdateButton={false}
            onTimeChange={onTimeChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            placeholder={i18n.translate('xpack.infra.ml.anomalyFlyout.searchPlaceholder', {
              defaultMessage: 'Search for anomalies',
            })}
            value={search}
            onChange={onSearchChange}
            isClearable={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.infra.ml.anomalyFlyout.jobTypLegend', {
              defaultMessage: 'Job Types',
            })}
            options={toggleButtons}
            idSelected={jobType}
            onChange={changeJobType}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size={'m'} />

      <EuiTable responsive={false}>
        <EuiTableHeader>
          {columns.map((column) => (
            <EuiTableHeaderCell
              key={`${String(column.field)}-header`}
              align={'left'}
              width={column.width}
              onSort={
                column.sortable
                  ? () => {
                      let sd: SortDir = 'desc';
                      if (sortField === column.field) {
                        sd = sortDir === 'asc' ? 'desc' : 'asc';
                      }
                      setSortDir(sd);
                      setSortField(column.field as SortField);
                      changeSortOptions({ field: column.field as SortField, direction: sd });
                    }
                  : undefined
              }
              isSorted={sortField === column.field}
              isSortAscending={sortField === column.field && sortDir === 'asc'}
            >
              {column.name}
            </EuiTableHeaderCell>
          ))}
        </EuiTableHeader>
        <EuiTableBody>
          {results.map((r) => (
            <EuiTableRow>
              {columns.map((column, i) => (
                <EuiTableRowCell
                  width={column.width}
                  key={`${String(column.field)}-${i}`}
                  header={column.name}
                  truncateText={column.truncate || false}
                  textOnly={column.textOnly ?? true}
                >
                  {column.render(r)}
                </EuiTableRowCell>
              ))}
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>
      <EuiSpacer size="l" />
      <PaginationControls
        fetchNextPage={fetchNextPage}
        fetchPreviousPage={fetchPreviousPage}
        page={page}
        isLoading={isLoading}
      />
    </div>
  );
};

const stringToNumericTimeRange = (timeRange: {
  start: string;
  end: string;
}): { start: number; end: number } => ({
  start: moment(
    DateMath.parse(timeRange.start, {
      momentInstance: moment,
    })
  ).valueOf(),
  end: moment(
    DateMath.parse(timeRange.end, {
      momentInstance: moment,
      roundUp: true,
    })
  ).valueOf(),
});

const columns: Array<{
  name: string;
  sortable: boolean;
  render: Function;
  width?: string | number;
  truncate?: boolean;
  textOnly?: boolean;
}> = [
  {
    field: 'startTime',
    name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnTime', {
      defaultMessage: 'Time',
    }),
    width: '15%',
    sortable: true,
    textOnly: true,
    truncate: true,
    render: (item: MetricsHostsAnomaly) => moment(item.startTime).format(),
  },
  {
    field: 'jobId',
    name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnJob', {
      defaultMessage: 'Job',
    }),
    width: '15%',
    sortable: false,
    render: (item: MetricsHostsAnomaly) => item.jobId,
  },
  {
    field: 'anomalyScore',
    name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnSeverit', {
      defaultMessage: 'Severity',
    }),
    width: '15%',
    sortable: true,
    render: (item: MetricsHostsAnomaly) => (
      <AnomalySeverityIndicator anomalyScore={item.anomalyScore} />
    ),
  },
  {
    field: 'typical',
    name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnSummary', {
      defaultMessage: 'Summary',
    }),
    width: '15%',
    sortable: false,
    textOnly: true,
    render: (item: MetricsHostsAnomaly) => <AnomalySummary anomaly={item} />,
  },
  {
    field: 'influencers',
    name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnInfluencerName', {
      defaultMessage: 'Node name',
    }),
    width: '15%',
    sortable: false,
    textOnly: true,
    truncate: true,
    render: (item: MetricsHostsAnomaly) => item.influencers.join(','),
  },
];
