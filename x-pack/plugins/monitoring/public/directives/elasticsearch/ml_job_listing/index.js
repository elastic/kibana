/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize } from 'lodash';
import numeral from '@elastic/numeral';
import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { MachineLearningJobStatusIcon } from 'plugins/monitoring/components/elasticsearch/ml_job_listing/status_icon';
import { SORT_ASCENDING } from '../../../../common/constants';
import { LARGE_ABBREVIATED, LARGE_BYTES } from '../../../../common/formatting';
import {
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const filterFields = [ 'job_id', 'state', 'node.name' ];
const columns = [
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.jobIdTitle', {
      defaultMessage: 'Job ID'
    }),
    sortKey: 'job_id',
    sortOrder: SORT_ASCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.stateTitle', {
      defaultMessage: 'State'
    }),
    sortKey: 'state'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.processedRecordsTitle', {
      defaultMessage: 'Processed Records'
    }),
    sortKey: 'data_counts.processed_record_count'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.modelSizeTitle', {
      defaultMessage: 'Model Size'
    }),
    sortKey: 'model_size_stats.model_bytes'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.forecastsTitle', {
      defaultMessage: 'Forecasts'
    }),
    sortKey: 'forecasts_stats.total'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.nodeTitle', {
      defaultMessage: 'Node'
    }),
    sortKey: 'node.name'
  }
];
const jobRowFactory = (scope, kbnUrl) => {
  const goToNode = nodeId => {
    scope.$evalAsync(() => kbnUrl.changePath(`/elasticsearch/nodes/${nodeId}`));
  };
  const getNode = node => {
    if (node) {
      return (
        <EuiLink
          onClick={goToNode.bind(null, node.id)}
        >
          { node.name }
        </EuiLink>
      );
    }
    return i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.noDataLabel', {
      defaultMessage: 'N/A'
    });
  };

  return function JobRow(props) {
    return (
      <KuiTableRow>
        <KuiTableRowCell>{ props.job_id }</KuiTableRowCell>
        <KuiTableRowCell>
          <MachineLearningJobStatusIcon status={props.state} />&nbsp;
          { capitalize(props.state) }
        </KuiTableRowCell>
        <KuiTableRowCell>{ numeral(props.data_counts.processed_record_count).format(LARGE_ABBREVIATED) }</KuiTableRowCell>
        <KuiTableRowCell>{ numeral(props.model_size_stats.model_bytes).format(LARGE_BYTES) }</KuiTableRowCell>
        <KuiTableRowCell>{ numeral(props.forecasts_stats.total).format(LARGE_ABBREVIATED) }</KuiTableRowCell>
        <KuiTableRowCell>
          { getNode(props.node) }
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringMlListing', (kbnUrl, i18n) => {
  return {
    restrict: 'E',
    scope: {
      jobs: '=',
      pageIndex: '=',
      filterText: '=',
      sortKey: '=',
      sortOrder: '=',
      onNewState: '=',
    },
    link(scope, $el) {

      const getNoDataMessage = filterText => {
        if (filterText) {
          return (
            i18n('xpack.monitoring.elasticsearch.mlJobListing.noFilteredJobsDescription', {
              // eslint-disable-next-line max-len
              defaultMessage: 'There are no Machine Learning Jobs that match the filter [{filterText}] or the time range. Try changing the filter or time range.',
              values: {
                filterText: filterText.trim()
              }
            })
          );
        }
        return i18n('xpack.monitoring.elasticsearch.mlJobListing.noJobsDescription', {
          defaultMessage: 'There are no Machine Learning Jobs that match your query. Try changing the time range selection.'
        });
      };

      const filterJobsPlaceholder = i18n('xpack.monitoring.elasticsearch.mlJobListing.filterJobsPlaceholder', {
        defaultMessage: 'Filter Jobs…'
      });

      scope.$watch('jobs', (jobs = []) => {
        const mlTable = (
          <MonitoringTable
            className="mlJobsTable"
            rows={jobs}
            pageIndex={scope.pageIndex}
            filterText={scope.filterText}
            sortKey={scope.sortKey}
            sortOrder={scope.sortOrder}
            onNewState={scope.onNewState}
            placeholder={filterJobsPlaceholder}
            filterFields={filterFields}
            columns={columns}
            rowComponent={jobRowFactory(scope, kbnUrl)}
            getNoDataMessage={getNoDataMessage}
          />
        );
        render(mlTable, $el[0]);
      });

    }
  };
});
