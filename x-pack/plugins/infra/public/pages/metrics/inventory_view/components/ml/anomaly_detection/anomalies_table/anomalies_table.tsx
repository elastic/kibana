/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import {
  EuiFlexItem,
  EuiSpacer,
  EuiFieldSearch,
  EuiBasicTable,
  EuiFlexGroup,
  EuiTableFieldDataColumnType,
  EuiTableActionsColumnType,
  Criteria,
  EuiContextMenuItem,
  EuiComboBox,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiIcon,
  EuiText,
  OnTimeChangeProps,
} from '@elastic/eui';
import { FormattedMessage, FormattedDate } from '@kbn/i18n-react';
import { withTheme } from '@kbn/kibana-react-plugin/common';
import { useLinkProps } from '@kbn/observability-plugin/public';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { datemathToEpochMillis } from '../../../../../../../utils/datemath';
import { SnapshotMetricType } from '../../../../../../../../common/inventory_models/types';
import { useSorting } from '../../../../../../../hooks/use_sorting';
import { useMetricsK8sAnomaliesResults } from '../../../../hooks/use_metrics_k8s_anomalies';
import { useMetricsHostsAnomaliesResults } from '../../../../hooks/use_metrics_hosts_anomalies';
import {
  Metric,
  MetricsHostsAnomaly,
  Sort,
} from '../../../../../../../../common/http_api/infra_ml/results';
import { PaginationControls } from './pagination';
import { AnomalySummary } from './annomaly_summary';
import { AnomalySeverityIndicator } from '../../../../../../../components/logging/log_analysis_results/anomaly_severity_indicator';
import { useSourceContext } from '../../../../../../../containers/metrics_source';
import { createResultsUrl } from '../flyout_home';
import { useWaffleViewState, WaffleViewState } from '../../../../hooks/use_waffle_view_state';
type JobType = 'k8s' | 'hosts';
type SortField = 'anomalyScore' | 'startTime';
interface JobOption {
  id: JobType;
  label: string;
}
const AnomalyActionMenu = ({
  jobId,
  type,
  startTime,
  closeFlyout,
  influencerField,
  influencers,
  disableShowInInventory,
}: {
  jobId: string;
  type: string;
  startTime: number;
  closeFlyout: () => void;
  influencerField: string;
  influencers: string[];
  disableShowInInventory?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);
  const { onViewChange } = useWaffleViewState();

  const showInInventory = useCallback(() => {
    const metricTypeMap: { [key in Metric]: SnapshotMetricType } = {
      memory_usage: 'memory',
      network_in: 'rx',
      network_out: 'tx',
    };
    // parse the anomaly job id for metric type
    const jobIdParts = jobId.split('-');
    const jobIdMetric = jobIdParts[jobIdParts.length - 1];
    const metricType = metricTypeMap[jobIdMetric.replace(/hosts_|k8s_/, '') as Metric];
    const anomalyViewParams: WaffleViewState = {
      metric: { type: metricType },
      sort: { by: 'name', direction: 'desc' },
      groupBy: [],
      nodeType: type === 'metrics_k8s' ? 'pod' : 'host',
      view: 'map',
      customOptions: [],
      customMetrics: [],
      boundsOverride: { max: 1, min: 0 },
      autoBounds: true,
      accountId: '',
      region: '',
      autoReload: false,
      filterQuery: {
        expression: influencers.reduce((query, i) => {
          if (query) {
            query = `${query} or `;
          }
          return `${query} ${influencerField}: "${i}"`;
        }, ''),
        kind: 'kuery',
      },
      legend: { palette: 'cool', reverseColors: false, steps: 10 },
      time: startTime,
    };
    onViewChange(anomalyViewParams);
    closeFlyout();
  }, [jobId, onViewChange, startTime, type, influencers, influencerField, closeFlyout]);

  const anomaliesUrl = useLinkProps({
    app: 'ml',
    pathname: `/explorer?_g=${createResultsUrl([jobId.toString()])}`,
  });

  const items = [
    <EuiContextMenuItem key="openInAnomalyExplorer" icon="popout" {...anomaliesUrl}>
      <FormattedMessage
        id="xpack.infra.ml.anomalyFlyout.actions.openInAnomalyExplorer"
        defaultMessage="Open in Anomaly Explorer"
      />
    </EuiContextMenuItem>,
  ];

  if (!disableShowInInventory) {
    items.push(
      <EuiContextMenuItem key="showInInventory" icon="search" onClick={showInInventory}>
        <FormattedMessage
          id="xpack.infra.ml.anomalyFlyout.actions.showInInventory"
          defaultMessage="Show in Inventory"
        />
      </EuiContextMenuItem>
    );
  }

  return (
    <>
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        button={
          <EuiButtonIcon
            iconType="boxesHorizontal"
            onClick={handleToggleMenu}
            aria-label={i18n.translate('xpack.infra.ml.anomalyFlyout.actions.openActionMenu', {
              defaultMessage: 'Open',
            })}
          />
        }
        isOpen={isOpen}
        closePopover={close}
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    </>
  );
};
export const NoAnomaliesFound = withTheme(({ theme }) => (
  <EuiText>
    <EuiSpacer size="xl" />
    <p>
      <EuiIcon type="eyeClosed" size="xl" color={theme.eui.euiColorMediumShade} />
    </p>
    <h3 data-test-subj="noAnomaliesFoundMsg">
      <FormattedMessage
        id="xpack.infra.ml.anomalyFlyout.anomalyTable.noAnomaliesFound"
        defaultMessage="No anomalies found"
      />
    </h3>
    <EuiSpacer size="m" />
    <EuiText color="subdued">
      <FormattedMessage
        id="xpack.infra.ml.anomalyFlyout.anomalyTable.noAnomaliesSuggestion"
        defaultMessage="Try modifying your search or selected time range."
      />
    </EuiText>
  </EuiText>
));
interface Props {
  closeFlyout(): void;
  hostName?: string;
}
export const AnomaliesTable = (props: Props) => {
  const { closeFlyout, hostName } = props;
  const [search, setSearch] = useState('');
  const [start, setStart] = useState('now-30d');
  const [end, setEnd] = useState('now');
  const trackMetric = useUiTracker({ app: 'infra_metrics' });
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>({
    start: datemathToEpochMillis(start) || 0,
    end: datemathToEpochMillis(end, 'up') || 0,
  });
  const { sorting, setSorting } = useSorting<MetricsHostsAnomaly>({
    field: 'startTime',
    direction: 'desc',
  });
  const jobOptions = [
    {
      id: `hosts` as JobType,
      label: i18n.translate('xpack.infra.ml.anomalyFlyout.hostBtn', {
        defaultMessage: 'Hosts',
      }),
      'data-test-subj': 'anomaliesHostComboBoxItem',
    },
    {
      id: `k8s` as JobType,
      label: i18n.translate('xpack.infra.ml.anomalyFlyout.podsBtn', {
        defaultMessage: 'Kubernetes Pods',
      }),
      'data-test-subj': 'anomaliesK8sComboBoxItem',
    },
  ];
  const [jobType, setJobType] = useState<JobType>('hosts');
  const [selectedJobType, setSelectedJobType] = useState<JobOption[]>([
    jobOptions.find((item) => item.id === 'hosts') || jobOptions[0],
  ]);
  const { source } = useSourceContext();
  const anomalyThreshold = source?.configuration.anomalyThreshold;

  const onTimeChange = useCallback(
    ({ isInvalid, start: startChange, end: endChange }: OnTimeChangeProps) => {
      if (!isInvalid) {
        setStart(startChange);
        setEnd(endChange);
        setTimeRange({
          start: datemathToEpochMillis(startChange)!,
          end: datemathToEpochMillis(endChange, 'up')!,
        });
      }
    },
    []
  );

  const anomalyParams = useMemo(
    () => ({
      sourceId: 'default',
      anomalyThreshold: anomalyThreshold || 0,
      startTime: timeRange.start,
      endTime: timeRange.end,
      defaultSortOptions: {
        direction: sorting?.direction || 'desc',
        field: (sorting?.field || 'startTime') as SortField,
      },
      defaultPaginationOptions: { pageSize: 10 },
    }),
    [timeRange.start, timeRange.end, sorting?.field, sorting?.direction, anomalyThreshold]
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
  const page = useMemo(
    () => (jobType === 'hosts' ? hostPage : k8sPage),
    [jobType, hostPage, k8sPage]
  );
  const isLoading = useMemo(
    () => (jobType === 'hosts' ? hostLoading : k8sLoading),
    [jobType, hostLoading, k8sLoading]
  );
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

  const changeJobType = useCallback((selectedOptions) => {
    setSelectedJobType(selectedOptions);
    setJobType(selectedOptions[0].id);
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
    if (results) {
      results.forEach((r) => {
        if (r.influencers.length > 100) {
          trackMetric({ metric: 'metrics_ml_anomaly_detection_more_than_100_influencers' });
        }
      });
    }
  }, [results, trackMetric]);

  const onTableChange = (criteria: Criteria<MetricsHostsAnomaly>) => {
    setSorting(criteria.sort);
    changeSortOptions({
      field: (criteria?.sort?.field || 'startTime') as SortField,
      direction: criteria?.sort?.direction || 'desc',
    });
  };

  let columns: Array<
    | EuiTableFieldDataColumnType<MetricsHostsAnomaly>
    | EuiTableActionsColumnType<MetricsHostsAnomaly>
  > = [
    {
      field: 'startTime',
      name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnTime', {
        defaultMessage: 'Time',
      }),
      width: '15%',
      sortable: true,
      textOnly: true,
      truncateText: true,
      render: (startTime: number) => (
        <FormattedDate value={startTime} year="numeric" month="short" day="2-digit" />
      ),
    },
    {
      field: 'jobId',
      name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnJob', {
        defaultMessage: 'Job',
      }),
      width: '25%',
      render: (jobId: string) => jobId,
      'data-test-subj': 'anomalyRow',
    },
    {
      field: 'anomalyScore',
      name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnSeverit', {
        defaultMessage: 'Severity',
      }),
      width: '15%',
      sortable: true,
      render: (anomalyScore: number) => <AnomalySeverityIndicator anomalyScore={anomalyScore} />,
    },
    {
      field: 'typical',
      name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnSummary', {
        defaultMessage: 'Summary',
      }),
      width: '15%',
      textOnly: true,
      render: (typical: number, item: MetricsHostsAnomaly) => <AnomalySummary anomaly={item} />,
    },
    {
      field: 'influencers',
      name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnInfluencerName', {
        defaultMessage: 'Node name',
      }),
      width: '20%',
      textOnly: true,
      truncateText: true,
      render: (influencers: string[]) => influencers.join(','),
    },
    {
      name: i18n.translate('xpack.infra.ml.anomalyFlyout.columnActionsName', {
        defaultMessage: 'Actions',
      }),
      width: '10%',
      actions: [
        {
          render: (anomaly: MetricsHostsAnomaly) => {
            return (
              <AnomalyActionMenu
                jobId={anomaly.jobId}
                type={anomaly.type}
                influencerField={
                  anomaly.type === 'metrics_hosts' ? 'host.name' : 'kubernetes.pod.uid'
                }
                disableShowInInventory={anomaly.influencers.length > 100}
                influencers={anomaly.influencers}
                startTime={anomaly.startTime}
                closeFlyout={closeFlyout}
              />
            );
          },
        },
      ],
    },
  ];

  columns = hostName
    ? columns.filter((c) => {
        if ('field' in c) {
          return c.field !== 'influencers';
        }
        return true;
      })
    : columns;

  useEffect(() => {
    if (getAnomalies) {
      getAnomalies(undefined, search, hostName);
    }
  }, [getAnomalies, search, hostName]);

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            showUpdateButton={false}
            onTimeChange={onTimeChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {!hostName && (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiFieldSearch
              fullWidth
              placeholder={i18n.translate('xpack.infra.ml.anomalyFlyout.searchPlaceholder', {
                defaultMessage: 'Search',
              })}
              value={search}
              onChange={onSearchChange}
              isClearable={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiComboBox
              placeholder={i18n.translate('xpack.infra.ml.anomalyFlyout.jobTypeSelect', {
                defaultMessage: 'Select group',
              })}
              singleSelection={{ asPlainText: true }}
              options={jobOptions}
              selectedOptions={selectedJobType}
              onChange={changeJobType}
              isClearable={false}
              data-test-subj="anomaliesComboBoxType"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <EuiSpacer size={'m'} />

      <EuiBasicTable<MetricsHostsAnomaly>
        columns={columns}
        items={results}
        sorting={{ sort: sorting }}
        onChange={onTableChange}
        hasActions={true}
        loading={isLoading}
        noItemsMessage={
          isLoading ? (
            <FormattedMessage
              id="xpack.infra.ml.anomalyFlyout.anomalyTable.loading"
              defaultMessage="Loading anomalies"
            />
          ) : (
            <NoAnomaliesFound />
          )
        }
      />
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
