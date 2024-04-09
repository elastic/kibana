/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import type { Direction, EuiBasicTableColumn } from '@elastic/eui';
import { EuiIcon, EuiInMemoryTable, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { formatHumanReadableDateTime } from '@kbn/ml-date-utils';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { useGroupActions } from './actions';
import type { Group, GroupsDictionary } from './anomaly_detection_panel';
import { JobSelectorBadge } from '../../../components/job_selector/job_selector_badge';
import { toLocaleString } from '../../../util/string_utils';
import { SwimlaneContainer } from '../../../explorer/swimlane_container';
import { useMlKibana } from '../../../contexts/kibana';

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
  chartsService: ChartsPluginStart;
}

export const AnomalyDetectionTable: FC<Props> = ({ items, chartsService }) => {
  const groupsList = Object.values(items);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(AnomalyDetectionListColumns.id);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const {
    services: { uiSettings },
  } = useMlKibana();
  const timeBuckets = useTimeBuckets(uiSettings);

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

        if (swimLaneData.points.length > 0 && swimLaneData.points.every((v) => v.value === 0)) {
          return (
            <FormattedMessage
              id="xpack.ml.overview.anomalyDetection.noAnomaliesFoundMessage"
              defaultMessage="No anomalies found"
            />
          );
        }

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
            noDataWarning={
              <FormattedMessage
                id="xpack.ml.overview.anomalyDetection.noResultsFoundMessage"
                defaultMessage="No results found"
              />
            }
            chartsService={chartsService}
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
    <EuiInMemoryTable<Group>
      allowNeutralSort={false}
      className="mlAnomalyDetectionTable"
      columns={columns}
      isExpandable={false}
      isSelectable={false}
      items={groupsList}
      itemId={AnomalyDetectionListColumns.id}
      onTableChange={onTableChange}
      pagination={pagination}
      sorting={sorting}
      data-test-subj="mlOverviewTableAnomalyDetection"
    />
  );
};
