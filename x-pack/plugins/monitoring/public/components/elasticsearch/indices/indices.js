/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { capitalize, get } from 'lodash';
import { SORT_ASCENDING, SORT_DESCENDING } from '../../../../common/constants';
import { LARGE_FLOAT, LARGE_BYTES, LARGE_ABBREVIATED } from '../../../../common/formatting';
import { formatMetric } from '../../../lib/format_number';
import { ElasticsearchStatusIcon } from '../status_icon';
import { ClusterStatus } from '../cluster_status';
import { MonitoringTable } from '../../table';
import { EuiLink } from '@elastic/eui';
import { KuiTableRowCell, KuiTableRow } from '@kbn/ui-framework/components';
import { SystemIndicesCheckbox } from './system_indices_checkbox';

const filterFields = ['name', 'status'];
const columns = [
  { title: 'Name', sortKey: 'name', secondarySortOrder: SORT_ASCENDING },
  { title: 'Status', sortKey: 'status_sort', sortOrder: SORT_DESCENDING }, // default sort: red, then yellow, then green
  { title: 'Document Count', sortKey: 'doc_count' },
  { title: 'Data', sortKey: 'data_size' },
  { title: 'Index Rate', sortKey: 'index_rate' },
  { title: 'Search Rate', sortKey: 'search_rate' },
  { title: 'Unassigned Shards', sortKey: 'unassigned_shards' }
];
const IndexRow = ({ status, ...props }) => (
  <KuiTableRow>
    <KuiTableRowCell data-test-subj="name">
      <EuiLink
        href={`#/elasticsearch/indices/${props.name}`}
        data-test-subj={`indexLink-${props.name}`}
      >
        {props.name}
      </EuiLink>
    </KuiTableRowCell>
    <KuiTableRowCell>
      <div title={`Index status: ${status}`}>
        <ElasticsearchStatusIcon status={status} />&nbsp;
        {capitalize(status)}
      </div>
    </KuiTableRowCell>
    <KuiTableRowCell data-test-subj="documentCount">
      {formatMetric(get(props, 'doc_count'), LARGE_ABBREVIATED)}
    </KuiTableRowCell>
    <KuiTableRowCell data-test-subj="dataSize">
      {formatMetric(get(props, 'data_size'), LARGE_BYTES)}
    </KuiTableRowCell>
    <KuiTableRowCell data-test-subj="indexRate">
      {formatMetric(get(props, 'index_rate'), LARGE_FLOAT, '/s')}
    </KuiTableRowCell>
    <KuiTableRowCell data-test-subj="searchRate">
      {formatMetric(get(props, 'search_rate'), LARGE_FLOAT, '/s')}
    </KuiTableRowCell>
    <KuiTableRowCell data-test-subj="unassignedShards">
      {formatMetric(get(props, 'unassigned_shards'), '0')}
    </KuiTableRowCell>
  </KuiTableRow>
);

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

const renderToolBarSection = ({ showSystemIndices, toggleShowSystemIndices, ...props }) => (
  <SystemIndicesCheckbox
    showSystemIndices={showSystemIndices}
    toggleShowSystemIndices={toggleShowSystemIndices}
    {...props}
  />
);

export function ElasticsearchIndices({ clusterStatus, indices, ...props }) {
  return (
    <Fragment>
      <ClusterStatus stats={clusterStatus} />
      <MonitoringTable
        className="elasticsearchIndicesTable"
        rows={indices}
        pageIndex={props.pageIndex}
        filterText={props.filterText}
        sortKey={props.sortKey}
        sortOrder={props.sortOrder}
        onNewState={props.onNewState}
        placeholder="Filter Indices..."
        filterFields={filterFields}
        renderToolBarSections={renderToolBarSection}
        columns={columns}
        rowComponent={IndexRow}
        getNoDataMessage={getNoDataMessage}
        showSystemIndices={props.showSystemIndices}
        toggleShowSystemIndices={props.toggleShowSystemIndices}
      />
    </Fragment>
  );
}

