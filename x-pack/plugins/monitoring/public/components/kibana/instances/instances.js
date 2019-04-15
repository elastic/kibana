/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiPanel, EuiSpacer, EuiLink, EuiButton, EuiBadge } from '@elastic/eui';
import { get, capitalize } from 'lodash';
import { ClusterStatus } from '../cluster_status';
import { EuiMonitoringTable } from '../../table';
import { KibanaStatusIcon } from '../status_icon';
import { formatMetric, formatNumber } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { I18nContext } from 'ui/i18n';
// import { Flyout } from '../../metricbeat_migration/flyout';

const Flyout = () => '';
const getColumns = (kbnUrl, scope, setupMode, openFlyout) => {
  const columns = [
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.nameColumnTitle', {
        defaultMessage: 'Name'
      }),
      field: 'name',
      render: (name, kibana) => (
        <EuiLink
          onClick={() => {
            scope.$evalAsync(() => {
              kbnUrl.changePath(`/kibana/instances/${kibana.kibana.uuid}`);
            });
          }}
          data-test-subj={`kibanaLink-${name}`}
        >
          { name }
        </EuiLink>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.statusColumnTitle', {
        defaultMessage: 'Status'
      }),
      field: 'status',
      render: (status, kibana) => (
        <div
          title={`Instance status: ${status}`}
          className="monTableCell__status"
        >
          <KibanaStatusIcon status={status} availability={kibana.availability} />&nbsp;
          { !kibana.availability ? (
            <FormattedMessage
              id="xpack.monitoring.kibana.listing.instanceStatus.offlineLabel"
              defaultMessage="Offline"
            />
          ) : capitalize(status) }
        </div>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.loadAverageColumnTitle', {
        defaultMessage: 'Load Average'
      }),
      field: 'os.load.1m',
      render: value => (
        <span>
          {formatMetric(value, '0.00')}
        </span>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.memorySizeColumnTitle', {
        defaultMessage: 'Memory Size'
      }),
      field: 'process.memory.resident_set_size_in_bytes',
      render: value => (
        <span>
          {formatNumber(value, 'byte')}
        </span>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.requestsColumnTitle', {
        defaultMessage: 'Requests'
      }),
      field: 'requests.total',
      render: value => (
        <span>
          {formatNumber(value, 'int_commas')}
        </span>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.responseTimeColumnTitle', {
        defaultMessage: 'Response Times'
      }),
      // It is possible this does not exist through MB collection
      field: 'response_times.average',
      render: (value, kibana) => {
        if (!value) {
          return null;
        }

        return (
          <div>
            <div className="monTableCell__splitNumber">
              { value && (formatNumber(value, 'int_commas') + ' ms avg') }
            </div>
            <div className="monTableCell__splitNumber">
              { formatNumber(kibana.response_times.max, 'int_commas') } ms max
            </div>
          </div>
        );
      }
    }
  ];

  if (setupMode.enabled) {
    columns.push({
      name: 'Migration Status',
      field: 'kibana.uuid',
      render: (uuid) => {
        const list = get(setupMode, 'data.kibana.byUuid', {});
        const status = list[uuid] || {};

        if (status.isInternalCollector || status.isPartiallyMigrated) {
          return (
            <EuiButton color="danger" onClick={() => openFlyout(uuid)}>
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

  return columns;
};

export class KibanaInstances extends Component {
  state = { isFlyoutOpen: false, activeInstanceUuid: null }

  openFlyout = (activeInstanceUuid) => {
    this.setState({ isFlyoutOpen: true, activeInstanceUuid });
  }

  closeFlyout = () => {
    this.setState({ isFlyoutOpen: false, activeInstanceUuid: null });
  }

  render() {
    const {
      instances,
      clusterStatus,
      angular,
      setupMode
    } = this.props;

    const dataFlattened = instances.map(item => ({
      ...item,
      name: item.kibana.name,
      status: item.kibana.status,
    }));

    const productListByUuid = get(setupMode, 'data.kibana.byUuid', {});
    const product = productListByUuid[this.state.activeInstanceUuid];

    return (
      <I18nContext>
        <EuiPage>
          <EuiPageBody>
            <EuiPanel>
              <ClusterStatus stats={clusterStatus} />
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiPageContent>
              <EuiMonitoringTable
                className="kibanaInstancesTable"
                rows={dataFlattened}
                columns={getColumns(angular.kbnUrl, angular.$scope, setupMode, this.openFlyout)}
                sorting={this.sorting}
                pagination={this.pagination}
                search={{
                  box: {
                    incremental: true,
                    placeholder: i18n.translate('xpack.monitoring.kibana.listing.filterInstancesPlaceholder', {
                      defaultMessage: 'Filter Instances…'
                    })
                  },
                }}
                onTableChange={this.onTableChange}
                executeQueryOptions={{
                  defaultFields: ['name']
                }}
              />
              { this.state.isFlyoutOpen ?
                <Flyout
                  onClose={() => this.closeFlyout()}
                  productName="kibana"
                  product={product}
                  updateProduct={setupMode.updateSetupModeData}
                // products={capabilities}
                // updateCapabilities={() => this.updateCapabilities()}
                />
                : null
              }
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      </I18nContext>
    );
  }
}
