/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize, get } from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { SORT_ASCENDING, SORT_DESCENDING } from '../../../../common/constants';
import { LARGE_FLOAT, LARGE_BYTES, LARGE_ABBREVIATED } from '../../../../common/formatting';
import { uiModules } from 'ui/modules';
import {
  KuiTableRowCell,
  KuiTableRow,
} from '@kbn/ui-framework/components';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { ShowSytemIndicesCheckbox } from 'plugins/monitoring/components/elasticsearch/index_listing';
import { ElasticsearchStatusIcon } from 'plugins/monitoring/components/elasticsearch/status_icon';
import { formatMetric } from '../../../lib/format_number';
import {
  EuiLink,
} from '@elastic/eui';

const filterFields = ['name', 'status'];
const cols = [
  { title: 'Name', sortKey: 'name', secondarySortOrder: SORT_ASCENDING },
  { title: 'Status', sortKey: 'statusSort', sortOrder: SORT_DESCENDING }, // default sort: red, then yellow, then green
  { title: 'Document Count', sortKey: 'doc_count' },
  { title: 'Data', sortKey: 'data_size' },
  { title: 'Index Rate', sortKey: 'index_rate' },
  { title: 'Search Rate', sortKey: 'search_rate' },
  { title: 'Unassigned Shards', sortKey: 'unassigned_shards' }
];
const indexRowFactory = (scope, kbnUrl) => {
  return class IndexRow extends React.Component { // eslint-disable-line react/no-multi-comp
    constructor(props) {
      super(props);
      this.changePath = this.changePath.bind(this);
    }
    changePath() {
      scope.$evalAsync(() => {
        kbnUrl.changePath(`/elasticsearch/indices/${this.props.name}`);
      });
    }
    render() {
      const status = this.props.status;

      return (
        <KuiTableRow>
          <KuiTableRowCell data-test-subj="name">
            <EuiLink
              onClick={this.changePath}
              data-test-subj={`indexLink-${this.props.name}`}
            >
              {this.props.name}
            </EuiLink>
          </KuiTableRowCell>
          <KuiTableRowCell>
            <div title={`Index status: ${status}`}>
              <ElasticsearchStatusIcon status={status} />&nbsp;
              {capitalize(status)}
            </div>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="documentCount">
            {formatMetric(get(this.props, 'doc_count'), LARGE_ABBREVIATED)}
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="dataSize">
            {formatMetric(get(this.props, 'data_size'), LARGE_BYTES)}
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="indexRate">
            {formatMetric(get(this.props, 'index_rate'), LARGE_FLOAT, '/s')}
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="searchRate">
            {formatMetric(get(this.props, 'search_rate'), LARGE_FLOAT, '/s')}
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="unassignedShards">
            {formatMetric(get(this.props, 'unassigned_shards'), '0')}
          </KuiTableRowCell>
        </KuiTableRow>
      );
    }
  };
};

const getNoDataMessage = filterText => {
  if (filterText) {
    return (
      <div>
        <p>
          There are no indices that match your selection with the filter [{filterText.trim()}].
          Try changing the filter or the time range selection.
        </p>
        <p>
          If you are looking for system indices (e.g., .kibana), try checking &lsquo;Show system indices&rsquo;.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p>There are no indices that match your selections. Try changing the time range selection.</p>
      <p>If you are looking for system indices (e.g., .kibana), try checking &lsquo;Show system indices&rsquo;.</p>
    </div>
  );
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringIndexListing', kbnUrl => {
  return {
    restrict: 'E',
    scope: {
      indices: '=',
      pageIndex: '=',
      filterText: '=',
      sortKey: '=',
      sortOrder: '=',
      onNewState: '=',
      showSystemIndices: '=',
      toggleShowSystemIndices: '='
    },
    link(scope, $el) {
      const toggleShowSystemIndices = isChecked => {
        scope.$evalAsync(() => {
          scope.toggleShowSystemIndices(isChecked);
        });
      };
      const renderToolBarSection = props => (
        <ShowSytemIndicesCheckbox
          showSystemIndices={scope.showSystemIndices}
          toggleShowSystemIndices={toggleShowSystemIndices}
          {...props}
        />
      );

      scope.$watch('indices', (indices = []) => {
        const instancesTable = (
          <MonitoringTable
            className="indicesTable"
            rows={indices}
            pageIndex={scope.pageIndex}
            filterText={scope.filterText}
            sortKey={scope.sortKey}
            sortOrder={scope.sortOrder}
            onNewState={scope.onNewState}
            placeholder="Filter Indices..."
            filterFields={filterFields}
            renderToolBarSections={renderToolBarSection}
            columns={cols}
            rowComponent={indexRowFactory(scope, kbnUrl)}
            getNoDataMessage={getNoDataMessage}
          />
        );
        render(instancesTable, $el[0]);
      });
    }
  };
});
