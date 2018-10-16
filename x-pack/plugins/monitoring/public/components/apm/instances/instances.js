/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { MonitoringTable } from '../../table';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import { EuiLink } from '@elastic/eui';
import { Status } from './status';
import { SORT_ASCENDING, SORT_DESCENDING, TABLE_ACTION_UPDATE_FILTER } from '../../../../common/constants';
import { formatMetric } from '../../../lib/format_number';
import { formatTimestampToDuration } from '../../../../common';


const filterFields = [ 'name', 'type', 'version', 'output' ];
const columns = [
  { title: 'Name', sortKey: 'name', sortOrder: SORT_ASCENDING },
  { title: 'Output Enabled', sortKey: 'output' },
  { title: 'Total Events Rate', sortKey: 'total_events_rate', secondarySortOrder: SORT_DESCENDING },
  { title: 'Bytes Sent Rate', sortKey: 'bytes_sent_rate' },
  { title: 'Output Errors', sortKey: 'errors' },
  { title: 'Last Event', sortKey: 'time_of_last_event' },
  { title: 'Allocated Memory', sortKey: 'memory' },
  { title: 'Version', sortKey: 'version' },
];
const instanceRowFactory = () => {
  return function KibanaRow(props) {
    const applyFiltering = filterText => () => {
      props.dispatchTableAction(TABLE_ACTION_UPDATE_FILTER, filterText);
    };

    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monTableCell__name">
            <EuiLink
              href={`#/apm/instances/${props.uuid}`}
              data-test-subj={`apmLink-${props.name}`}
            >
              {props.name}
            </EuiLink>
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          {props.output}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.total_events_rate, '', '/s')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.bytes_sent_rate, 'byte', '/s')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.errors, '0')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatTimestampToDuration(+moment(props.time_of_last_event), 'since') + ' ago'}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.memory, 'byte')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          <EuiLink
            onClick={applyFiltering(props.version)}
          >
            {props.version}
          </EuiLink>
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

export function ApmServerInstances({ apms }) {
  const {
    pageIndex,
    filterText,
    sortKey,
    sortOrder,
    onNewState,
  } = apms;

  return (
    <div>
      <Status stats={apms.data.stats}/>
      <MonitoringTable
        className="apmInstancesTable"
        rows={apms.data.apms}
        pageIndex={pageIndex}
        filterText={filterText}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onNewState={onNewState}
        placeholder="Filter Instances..."
        filterFields={filterFields}
        columns={columns}
        rowComponent={instanceRowFactory()}
      />
    </div>
  );
}
