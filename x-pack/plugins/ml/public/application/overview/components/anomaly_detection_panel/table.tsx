/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import {
  Direction,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatHumanReadableDateTime } from '../../../../../common/util/date_utils';
import { useGroupActions } from './actions';
import { Group, GroupsDictionary } from './anomaly_detection_panel';
import { JobStatsBarStats, StatsBar } from '../../../components/stats_bar';
import { JobSelectorBadge } from '../../../components/job_selector/job_selector_badge';
import { toLocaleString } from '../../../util/string_utils';
import { SwimlaneContainer } from '../../../explorer/swimlane_container';
import { useTimeBuckets } from '../../../components/custom_hooks/use_time_buckets';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { useMlLink } from '../../../contexts/kibana';

export enum AnomalyDetectionListColumns {
  id = 'id',
  maxAnomalyScore = 'max_anomaly_score',
  overallSwimLane = 'overallSwimLane',
  jobIds = 'jobIds',
  latestTimestamp = 'latest_timestamp',
  docsProcessed = 'docs_processed',
  jobsInGroup = 'jobs_in_group',
}

interface Props {
  items: GroupsDictionary;
  statsBarData: JobStatsBarStats;
}

export const AnomalyDetectionTable: FC<Props> = ({ items, statsBarData }) => {
  const groupsList = Object.values(items);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(AnomalyDetectionListColumns.id);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const timeBuckets = useTimeBuckets();

  const manageJobsLink = useMlLink({
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  const columns: Array<EuiBasicTableColumn<Group>> = [
    {
      field: AnomalyDetectionListColumns.id,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableId', {
        defaultMessage: 'Group ID',
      }),
      render: (id: Group['id']) => <JobSelectorBadge id={id} isGroup={id !== 'ungrouped'} />,
      sortable: true,
      truncateText: true,
      width: '15%',
    },
    {
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.ml.overview.anomalyDetection.tableOverallScoreTooltip', {
            defaultMessage: 'Overall anomaly scores within selected time range',
          })}
        >
          <span>
            {i18n.translate('xpack.ml.overview.anomalyDetection.overallScore', {
              defaultMessage: 'Overall score',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      render: (group: Group) => {
        const swimLaneData = group.overallSwimLane;

        if (!swimLaneData) return null;

        const hasResults = swimLaneData.points.length > 0;

        const noDatWarning = hasResults ? (
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.noAnomaliesFoundMessage"
            defaultMessage="No anomalies found"
          />
        ) : (
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.noResultsFoundMessage"
            defaultMessage="No results found"
          />
        );

        return (
          <SwimlaneContainer
            timeBuckets={timeBuckets}
            swimlaneData={group.overallSwimLane!}
            swimlaneType={'overall'}
            onResize={() => {}}
            isLoading={false}
            id={group.id}
            showTimeline={false}
            showYAxis={false}
            showLegend={false}
            noDataWarning={noDatWarning}
          />
        );
      },
      width: '300px',
    },
    {
      field: AnomalyDetectionListColumns.jobsInGroup,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableNumJobs', {
        defaultMessage: 'Jobs in group',
      }),
      sortable: true,
      truncateText: true,
      width: '10%',
    },
    {
      field: AnomalyDetectionListColumns.latestTimestamp,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableLatestTimestamp', {
        defaultMessage: 'Latest timestamp',
      }),
      dataType: 'date',
      render: (time: number) => formatHumanReadableDateTime(time),
      textOnly: true,
      truncateText: true,
      sortable: true,
      width: '25%',
    },
    {
      field: AnomalyDetectionListColumns.docsProcessed,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableDocsProcessed', {
        defaultMessage: 'Docs processed',
      }),
      render: (docs: number) => toLocaleString(docs),
      textOnly: true,
      sortable: true,
      width: '15%',
    },
    {
      name: i18n.translate('xpack.ml.overview.anomalyDetection.tableActionLabel', {
        defaultMessage: 'Actions',
      }),
      actions: useGroupActions(),
      width: '80px',
      align: 'right',
    },
  ];

  const onTableChange: EuiInMemoryTable<Group>['onTableChange'] = ({
    page = { index: 0, size: 10 },
    sort = { field: AnomalyDetectionListColumns.id, direction: 'asc' },
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field as string);
    setSortDirection(direction as Direction);
  };

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: groupsList.length,
    pageSizeOptions: [10, 20, 50],
    showPerPageOptions: true,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize={'s'}>
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <h3>
              {i18n.translate('xpack.ml.overview.anomalyDetection.panelTitle', {
                defaultMessage: 'Anomaly Detection',
              })}
            </h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize={'s'} alignItems="center">
            <EuiFlexItem grow={false}>
              <StatsBar stats={statsBarData} dataTestSub={'mlOverviewJobStatsBar'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="m" fill href={manageJobsLink}>
                {i18n.translate('xpack.ml.overview.anomalyDetection.manageJobsButtonText', {
                  defaultMessage: 'Manage jobs',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiInMemoryTable<Group>
        allowNeutralSort={false}
        className="mlAnomalyDetectionTable"
        columns={columns}
        hasActions={true}
        isExpandable={false}
        isSelectable={false}
        items={groupsList}
        itemId={AnomalyDetectionListColumns.id}
        onTableChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        data-test-subj="mlOverviewTableAnomalyDetection"
      />
    </>
  );
};
