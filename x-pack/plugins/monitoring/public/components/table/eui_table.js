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
import { ELASTICSEARCH_CUSTOM_ID } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class EuiMonitoringTable extends React.PureComponent {
  render() {
    const {
      rows: items,
      search = {},
      columns: _columns,
      setupMode,
      uuidField,
      nameField,
      ipField,
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

      if (!('sortable' in column)) {
        column.sortable = true;
      }
      return column;
    });

    if (setupMode && setupMode.enabled) {
      columns.push({
        name: 'Migration Status',
        field: uuidField,
        render: (uuid, product) => {
          const list = get(setupMode, 'data.byUuid', {});
          const status = list[uuid] || {};

          if (setupMode.productName === ELASTICSEARCH_CUSTOM_ID && status.isPartiallyMigrated) {
            return (
              <EuiBadge color="warning" iconType="check">
                {i18n.translate('xpack.monitoring.euiTable.monitoringUsingMetricbeatLabel', {
                  defaultMessage: 'Monitored using Metricbeat'
                })}
              </EuiBadge>
            );
          }

          if (status.isInternalCollector || status.isPartiallyMigrated) {
            const instance = {
              uuid: product[uuidField],
              name: product[nameField],
              ip: product[ipField]
            };
            return (
              <EuiButton color="danger" onClick={() => setupMode.openFlyout(instance)}>
                {i18n.translate('xpack.monitoring.euiTable.migrateButtonLabel', {
                  defaultMessage: 'Migrate'
                })}
              </EuiButton>
            );
          }

          if (status.isFullyMigrated) {
            return (
              <EuiBadge color="secondary" iconType="check">
                {i18n.translate('xpack.monitoring.euiTable.migratedStatusLabel', {
                  defaultMessage: 'Migrated'
                })}
              </EuiBadge>
            );
          }

          return i18n.translate('xpack.monitoring.euiTable.migrationStatusUnknown', {
            defaultMessage: 'N/A'
          });
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
