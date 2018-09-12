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
import { EuiLink } from '@elastic/eui';
import { Status } from './status';


const filterFields = [ 'beat.name' ];
const columns = [
];
const instanceRowFactory = () => {
  return function KibanaRow(props) {
    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monitoringTableCell__name">
            <EuiLink
              href={`/apm/instances/${get(props, 'beat.uuid')}`}
              data-test-subj={`apmLink-${get(props, 'beat.name')}`}
            >
              { props.beat.name }
            </EuiLink>
          </div>
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
