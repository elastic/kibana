/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { MonitoringTable } from '../../table';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import { SORT_ASCENDING, SORT_DESCENDING } from '../../../../common/constants';
import { EuiLink } from '@elastic/eui';
import { Status } from './status';


const filterFields = [ 'beat.name', 'beat.version' ];
const columns = [
  { title: 'Name', sortKey: 'beat.name', sortOrder: SORT_ASCENDING },
  { title: 'Version', sortKey: 'beat.version', sortOrder: SORT_ASCENDING },
  { title: 'Error Count', sortKey: 'errorCount', sortOrder: SORT_DESCENDING },
  // { title: 'Load Average', sortKey: 'os.load.1m' },
  // { title: 'Memory Size', sortKey: 'process.memory.resident_set_size_in_bytes' },
  // { title: 'Requests', sortKey: 'requests.total' },
  // { title: 'Response Times', sortKey: 'response_times.average' }
];
const instanceRowFactory = (goToInstance) => {
  return function KibanaRow(props) {
    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monitoringTableCell__name">
            <EuiLink
              onClick={goToInstance.bind(null, get(props, 'beat.uuid'))}
              data-test-subj={`apmLink-${props.beat.name}`}
            >
              { props.beat.name }
            </EuiLink>
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monitoringTableCell__version">
            <EuiLink
              onClick={goToInstance.bind(null, get(props, 'beat.uuid'))}
              data-test-subj={`apmLink-${props.beat.version}`}
            >
              { props.beat.version }
            </EuiLink>
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monitoringTableCell__number">
            <EuiLink
              onClick={goToInstance.bind(null, get(props, 'beat.uuid'))}
              data-test-subj={`apmLink-errors`}
            >
              { props.errorCount }
            </EuiLink>
          </div>
        </KuiTableRowCell>
        {/* <KuiTableRowCell>
          <div title={`Instance status: ${props.kibana.status}`} className="monitoringTableCell__status">
            <KibanaStatusIcon status={props.kibana.status} availability={props.availability} />&nbsp;
            { !props.availability ? 'Offline' : capitalize(props.kibana.status) }
          </div>
        </KuiTableRowCell> */}
        {/* <KuiTableRowCell>
          <div className="monitoringTableCell__number">
            { formatMetric(get(props, 'os.load["1m"]'), '0.00') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monitoringTableCell__number">
            { formatNumber(props.process.memory.resident_set_size_in_bytes, 'byte') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monitoringTableCell__number">
            { formatNumber(props.requests.total, 'int_commas') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monitoringTableCell__splitNumber">
            { props.response_times.average && (formatNumber(props.response_times.average, 'int_commas') + ' ms avg') }
          </div>
          <div className="monitoringTableCell__splitNumber">
            { formatNumber(props.response_times.max, 'int_commas') } ms max
          </div>
        </KuiTableRowCell> */}
      </KuiTableRow>
    );
  };
};

export function ApmServerInstances({ apms, goToInstance }) {
  const {
    pageIndex,
    filterText,
    sortKey,
    sortOrder,
    onNewState,
  } = apms;

  return (
    <div>
      <Status stats={apms.data.clusterStatus}/>
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
        rowComponent={instanceRowFactory(goToInstance)}
      />
    </div>
  );
}
