/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import numeral from '@elastic/numeral';
import React from 'react';
import {
  EuiLink,
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  Pagination,
  EuiTableSortingType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { LARGE_ABBREVIATED, LARGE_BYTES } from '../../../../common/formatting';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import type { MLJobs } from '../../../types';
import { EuiMonitoringTable } from '../../table';
import { MachineLearningJobStatusIcon } from '../ml_job_listing/status_icon';
import { ClusterStatus } from '../cluster_status';

interface Props {
  clusterStatus: boolean;
  jobs: MLJobs;
  onTableChange: (props: any) => void;
  sorting: EuiTableSortingType<string>;
  pagination: Pagination;
}

type MLJob = MLJobs[0];

export const ElasticsearchMLJobs = ({
  clusterStatus,
  jobs,
  sorting,
  pagination,
  onTableChange,
}: Props) => {
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiMonitoringTable
            className="mlJobsTable"
            rows={jobs}
            columns={columns}
            sorting={{
              ...sorting,
              sort: {
                ...sorting.sort,
                field: 'job_id',
              },
            }}
            pagination={pagination}
            message={i18n.translate(
              'xpack.monitoring.elasticsearch.mlJobListing.noJobsDescription',
              {
                defaultMessage:
                  'There are no Machine Learning Jobs that match your query. Try changing the time range selection.',
              }
            )}
            search={{
              box: {
                incremental: true,
                placeholder: i18n.translate(
                  'xpack.monitoring.elasticsearch.mlJobListing.filterJobsPlaceholder',
                  {
                    defaultMessage: 'Filter Jobs…',
                  }
                ),
              },
            }}
            onTableChange={onTableChange}
            executeQueryOptions={{
              defaultFields: ['job_id'],
            }}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

const columns = [
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.jobIdTitle', {
      defaultMessage: 'Job ID',
    }),
    field: 'job_id',
    sortable: true,
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.stateTitle', {
      defaultMessage: 'State',
    }),
    field: 'state',
    sortable: true,
    render: (state: string) => (
      <div>
        <MachineLearningJobStatusIcon status={state} />
        &nbsp;
        {capitalize(state)}
      </div>
    ),
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.processedRecordsTitle', {
      defaultMessage: 'Processed Records',
    }),
    field: 'data_counts.processed_record_count',
    sortable: true,
    render: (value: unknown) => <span>{numeral(value).format(LARGE_ABBREVIATED)}</span>,
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.modelSizeTitle', {
      defaultMessage: 'Model Size',
    }),
    field: 'model_size_stats.model_bytes',
    sortable: true,
    render: (value: unknown) => <span>{numeral(value).format(LARGE_BYTES)}</span>,
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.forecastsTitle', {
      defaultMessage: 'Forecasts',
    }),
    field: 'forecasts_stats.total',
    sortable: true,
    render: (value: unknown) => <span>{numeral(value).format(LARGE_ABBREVIATED)}</span>,
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.nodeTitle', {
      defaultMessage: 'Node',
    }),
    field: 'node.name',
    sortable: true,
    render: (name: string, job: MLJob) => {
      if (job.node) {
        if ('id' in job.node) {
          return (
            <EuiLink href={getSafeForExternalLink(`#/elasticsearch/nodes/${job.node.id}`)}>
              {name}
            </EuiLink>
          );
        } else return <span>{name}</span>;
      }

      return (
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.mlJobListing.noDataLabel"
          defaultMessage="N/A"
        />
      );
    },
  },
];
