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

const filterFields = [ 'job_id', 'state', 'node.name' ];
const columns = [
  { title: 'Job ID', sortKey: 'job_id', sortOrder: SORT_ASCENDING },
  { title: 'State', sortKey: 'state' },
  { title: 'Processed Records', sortKey: 'data_counts.processed_record_count' },
  { title: 'Model Size', sortKey: 'model_size_stats.model_bytes' },
  { title: 'Node', sortKey: 'node.name' }
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
    return 'N/A';
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
        <KuiTableRowCell>
          { getNode(props.node) }
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringMlListing', kbnUrl => {
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
            `There are no Machine Learning Jobs that match the filter [${filterText.trim()}] or the time range.
Try changing the filter or time range.`
          );
        }
        return 'There are no Machine Learning Jobs that match your query. Try changing the time range selection.';
      };

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
            placeholder="Filter Jobs..."
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
