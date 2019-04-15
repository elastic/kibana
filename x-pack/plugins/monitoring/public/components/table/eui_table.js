/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiBadge
} from '@elastic/eui';

export class EuiMonitoringTable extends React.PureComponent {
  render() {
    const {
      rows: items,
      search = {},
      columns: _columns,
      setupMode,
      productUuidField,
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

    if (setupMode && setupMode.enabled) {
      columns.push({
        name: 'Migration Status',
        field: productUuidField,
        render: (uuid) => {
          const list = get(setupMode, 'data.byUuid', {});
          const status = list[uuid] || {};

          if (status.isInternalCollector || status.isPartiallyMigrated) {
            return (
              <EuiButton color="danger" onClick={() => setupMode.openFlyout(uuid)}>
                Migrate
              </EuiButton>
            );
          }

          if (status.isFullyMigrated) {
            return (
              <EuiBadge color="secondary" iconType="check">
                Migrated
              </EuiBadge>
            );
          }

          return null;
        }
      });
    }

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
