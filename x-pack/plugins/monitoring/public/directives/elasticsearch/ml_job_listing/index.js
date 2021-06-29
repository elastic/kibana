/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import numeral from '@elastic/numeral';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EuiMonitoringTable } from '../../../components/table';
import { MachineLearningJobStatusIcon } from '../../../components/elasticsearch/ml_job_listing/status_icon';
import { LARGE_ABBREVIATED, LARGE_BYTES } from '../../../../common/formatting';
import { EuiLink, EuiPage, EuiPageContent, EuiPageBody, EuiPanel, EuiSpacer } from '@elastic/eui';
import { ClusterStatus } from '../../../components/elasticsearch/cluster_status';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';

const getColumns = () => [
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
    render: (state) => (
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
    render: (value) => <span>{numeral(value).format(LARGE_ABBREVIATED)}</span>,
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.modelSizeTitle', {
      defaultMessage: 'Model Size',
    }),
    field: 'model_size_stats.model_bytes',
    sortable: true,
    render: (value) => <span>{numeral(value).format(LARGE_BYTES)}</span>,
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.forecastsTitle', {
      defaultMessage: 'Forecasts',
    }),
    field: 'forecasts_stats.total',
    sortable: true,
    render: (value) => <span>{numeral(value).format(LARGE_ABBREVIATED)}</span>,
  },
  {
    name: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.nodeTitle', {
      defaultMessage: 'Node',
    }),
    field: 'node.name',
    sortable: true,
    render: (name, node) => {
      if (node) {
        return (
          <EuiLink href={getSafeForExternalLink(`#/elasticsearch/nodes/${node.id}`)}>
            {name}
          </EuiLink>
        );
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

//monitoringMlListing
export function monitoringMlListingProvider() {
  return {
    restrict: 'E',
    scope: {
      jobs: '=',
      paginationSettings: '=',
      sorting: '=',
      onTableChange: '=',
      status: '=',
    },
    link(scope, $el) {
      scope.$on('$destroy', () => $el && $el[0] && unmountComponentAtNode($el[0]));
      const columns = getColumns();

      const filterJobsPlaceholder = i18n.translate(
        'xpack.monitoring.elasticsearch.mlJobListing.filterJobsPlaceholder',
        {
          defaultMessage: 'Filter Jobs…',
        }
      );

      scope.$watch('jobs', (_jobs = []) => {
        const jobs = _jobs.map((job) => {
          if (job.ml) {
            return {
              ...job.ml.job,
              node: job.node,
              job_id: job.ml.job.id,
            };
          }
          return job;
        });
        const mlTable = (
          <EuiPage>
            <EuiPageBody>
              <EuiPanel>
                <ClusterStatus stats={scope.status} />
              </EuiPanel>
              <EuiSpacer size="m" />
              <EuiPageContent>
                <EuiMonitoringTable
                  className="mlJobsTable"
                  rows={jobs}
                  columns={columns}
                  sorting={{
                    ...scope.sorting,
                    sort: {
                      ...scope.sorting.sort,
                      field: 'job_id',
                    },
                  }}
                  pagination={scope.paginationSettings}
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
                      placeholder: filterJobsPlaceholder,
                    },
                  }}
                  onTableChange={scope.onTableChange}
                  executeQueryOptions={{
                    defaultFields: ['job_id'],
                  }}
                />
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        );
        render(mlTable, $el[0]);
      });
    },
  };
}
