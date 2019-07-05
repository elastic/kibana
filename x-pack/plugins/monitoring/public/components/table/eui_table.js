/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiInMemoryTable
} from '@elastic/eui';

export class EuiMonitoringTable extends React.PureComponent {
  render() {
    const {
      rows: items,
      search = {},
      columns: _columns,
      ...props
    } = this.props;

    if (search.box && !search.box['data-test-subj']) {
      search.box['data-test-subj'] = 'monitoringTableToolBar';
    }

    if (search.box && !search.box.schema) {
      search.box.schema = true;
    }

    const columns = _columns.map(column => {
      if (!column['data-test-subj']) {
        column['data-test-subj'] = 'monitoringTableHasData';
      }
      return column;
    });

    return (
      <div data-test-subj={`${this.props.className}Container`}>
        <EuiInMemoryTable
          items={items}
          search={search}
          columns={columns}
          {...props}
        />
      </div>
    );
  }
}
