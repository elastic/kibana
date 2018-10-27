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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const filterFields = ['name', 'status'];
const columns = [
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.indices.nameTitle', {
      defaultMessage: 'Name',
    }),
    sortKey: 'name',
    secondarySortOrder: SORT_ASCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.indices.statusTitle', {
      defaultMessage: 'Status',
    }),
    sortKey: 'status_sort',
    sortOrder: SORT_DESCENDING // default sort: red, then yellow, then green
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.indices.documentCountTitle', {
      defaultMessage: 'Document Count',
    }),
    sortKey: 'doc_count'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.indices.dataTitle', {
      defaultMessage: 'Data',
    }),
    sortKey: 'data_size'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.indices.indexRateTitle', {
      defaultMessage: 'Index Rate',
    }),
    sortKey: 'index_rate'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.indices.searchRateTitle', {
      defaultMessage: 'Search Rate',
    }),
    sortKey: 'search_rate'
  },
  {
    title: i18n.translate('xpack.monitoring.elasticsearch.indices.unassignedShardsTitle', {
      defaultMessage: 'Unassigned Shards',
    }),
    sortKey: 'unassigned_shards'
  }
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
      <div
        title={(
          <FormattedMessage
            id="xpack.monitoring.elasticsearch.indices.indexStatusTitle"
            defaultMessage="Index status: {status}"
            values={{
              status
            }}
          />
        )}
      >
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
  const howToShowSystemIndicesDescription = (
    <FormattedMessage
      id="xpack.monitoring.elasticsearch.indices.howToShowSystemIndicesDescription"
      defaultMessage="If you are looking for system indices (e.g., .kibana), try checking {leftSingleQuote}Show system indices{rightSingleQuote}."
      values={{
        leftSingleQuote: '&lsquo;',
        rightSingleQuote: '&rsquo;'
      }}
    />
  );
  if (filterText) {
    return (
      <div>
        <p>
          <FormattedMessage
              id="xpack.monitoring.elasticsearch.indices.noIndicesMatchYourSelectionWithTextFilterDescription"
              defaultMessage="There are no indices that match your selection with the filter [{filterText}].
              Try changing the filter or the time range selection."
              values={{
                filterText: filterText.trim()
              }}
            />
        </p>
        <p>
          {howToShowSystemIndicesDescription}
        </p>
      </div>
    );
  }
  return (
    <div>
      <p>
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.indices.noIndicesMatchYourSelectionDescription"
          defaultMessage="There are no indices that match your selections. Try changing the time range selection."
        />
      </p>
      <p>
        {howToShowSystemIndicesDescription}
      </p>
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

