/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { capitalize, get } from 'lodash';
import moment from 'moment';
import numeral from '@elastic/numeral';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import {
  EuiHealth,
  EuiLink,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { Tooltip } from 'plugins/monitoring/components/tooltip';
import { AlertsIndicator } from 'plugins/monitoring/components/cluster/listing/alerts_indicator';
import { SORT_ASCENDING } from '../../../../common/constants';

const filterFields = [ 'cluster_name', 'status', 'license.type' ];
const columns = [
  { title: 'Name', sortKey: 'cluster_name', sortOrder: SORT_ASCENDING },
  { title: 'Status', sortKey: 'status' },
  { title: 'Nodes', sortKey: 'elasticsearch.cluster_stats.nodes.count.total' },
  { title: 'Indices', sortKey: 'elasticsearch.cluster_stats.indices.count' },
  { title: 'Data', sortKey: 'elasticsearch.cluster_stats.indices.store.size_in_bytes' },
  { title: 'Logstash', sortKey: 'logstash.node_count' },
  { title: 'Kibana', sortKey: 'kibana.count' },
  { title: 'License', sortKey: 'license.type' }
];

const clusterRowFactory = (scope, globalState, kbnUrl, showLicenseExpiration) => {
  return class ClusterRow extends React.Component {
    constructor(props) {
      super(props);
    }

    changeCluster() {
      scope.$evalAsync(() => {
        globalState.cluster_uuid = this.props.cluster_uuid;
        globalState.ccs = this.props.ccs;
        globalState.save();
        kbnUrl.changePath('/overview');
      });
    }

    licenseWarning({ title, text }) {
      scope.$evalAsync(() => {
        toastNotifications.addWarning({ title, text, 'data-test-subj': 'monitoringLicenseWarning' });
      });
    }

    handleClickIncompatibleLicense() {
      this.licenseWarning({
        title: `You can't view the "${this.props.cluster_name}" cluster`,
        text: (
          <Fragment>
            <p>The Basic license does not support multi-cluster monitoring.</p>
            <p>
              Need to monitor multiple clusters?{' '}
              <a href="https://www.elastic.co/subscriptions/xpack" target="_blank">Get a license with full functionality</a>{' '}
              to enjoy multi-cluster monitoring.
            </p>
          </Fragment>
        ),
      });
    }

    handleClickInvalidLicense() {
      const licensingPath = `${chrome.getBasePath()}/app/kibana#/management/elasticsearch/license_management/home`;

      this.licenseWarning({
        title: `You can't view the "${this.props.cluster_name}" cluster`,
        text: (
          <Fragment>
            <p>The license information is invalid.</p>
            <p>
              Need a license?{' '}
              <a href={licensingPath}>Get a free Basic license</a> or{' '}
              <a href="https://www.elastic.co/subscriptions/xpack" target="_blank">get a license with full functionality</a>{' '}
              to enjoy multi-cluster monitoring.
            </p>
          </Fragment>
        ),
      });
    }

    getClusterAction() {
      if (this.props.isSupported) {
        return (
          <EuiLink
            onClick={this.changeCluster.bind(this)}
            data-test-subj="clusterLink"
          >
            { this.props.cluster_name }
          </EuiLink>
        );
      }

      // not supported because license is basic/not compatible with multi-cluster
      if (this.props.license) {
        return (
          <EuiLink
            onClick={this.handleClickIncompatibleLicense.bind(this)}
            data-test-subj="clusterLink"
          >
            { this.props.cluster_name }
          </EuiLink>
        );
      }

      // not supported because license is invalid
      return (
        <EuiLink
          onClick={this.handleClickInvalidLicense.bind(this)}
          data-test-subj="clusterLink"
        >
          { this.props.cluster_name }
        </EuiLink>
      );
    }

    getLicenseInfo() {
      if (this.props.license) {
        const licenseExpiry = () => {
          if (this.props.license.expiry_date_in_millis < moment().valueOf()) {
            // license is expired
            return (
              <span className="monitoringTableCell__ClusterCell__expired">
                Expired
              </span>
            );
          }

          // license is fine
          return (
            <span>
              Expires { moment(this.props.license.expiry_date_in_millis).format('D MMM YY') }
            </span>
          );
        };

        return (
          <div>
            <div className="monitoringTableCell__ClusterCell__license">
              { capitalize(this.props.license.type) }
            </div>
            <div className="monitoringTableCell__ClusterCell__expiration">
              { showLicenseExpiration ? licenseExpiry() : null }
            </div>
          </div>
        );
      }

      // there is no license!
      return (
        <EuiLink
          onClick={this.handleClickInvalidLicense.bind(this)}
        >
          <EuiHealth color="subdued" data-test-subj="alertIcon">
            N/A
          </EuiHealth>
        </EuiLink>
      );
    }

    render() {
      const isSupported = this.props.isSupported;
      const isClusterSupportedFactory = () => {
        return (props) => {
          if (isSupported) {
            return <span>{ props.children }</span>;
          }
          return <span>-</span>;
        };
      };
      const IsClusterSupported = isClusterSupportedFactory(isSupported);
      const classes = [];
      if (!isSupported) {
        classes.push('basic');
      }

      /*
       * This checks if alerts feature is supported via monitoring cluster
       * license. If the alerts feature is not supported because the prod cluster
       * license is basic, IsClusterSupported makes the status col hidden
       * completely
       */
      const IsAlertsSupported = (props) => {
        const {
          alertsMeta = { enabled: true },
          clusterMeta = { enabled: true }
        } = props.cluster.alerts;
        if (alertsMeta.enabled && clusterMeta.enabled) {
          return <span>{ props.children }</span>;
        }

        const message = alertsMeta.message || clusterMeta.message;
        return (
          <Tooltip
            text={message}
            placement="bottom"
            trigger="hover"
          >
            <EuiHealth color="subdued" data-test-subj="alertIcon">
              N/A
            </EuiHealth>
          </Tooltip>
        );
      };

      return (
        <KuiTableRow data-test-subj={`clusterRow_${this.props.cluster_uuid}`}>
          <KuiTableRowCell>
            <span className="monitoringTableCell__name">
              { this.getClusterAction() }
            </span>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="alertsStatus">
            <IsClusterSupported>
              <IsAlertsSupported cluster={this.props}>
                <AlertsIndicator alerts={this.props.alerts} />
              </IsAlertsSupported>
            </IsClusterSupported>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="nodesCount">
            <IsClusterSupported>
              { numeral(get(this.props, 'elasticsearch.cluster_stats.nodes.count.total')).format('0,0') }
            </IsClusterSupported>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="indicesCount">
            <IsClusterSupported>
              { numeral(get(this.props, 'elasticsearch.cluster_stats.indices.count')).format('0,0') }
            </IsClusterSupported>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="dataSize">
            <IsClusterSupported>
              { numeral(get(this.props, 'elasticsearch.cluster_stats.indices.store.size_in_bytes')).format('0,0[.]0 b') }
            </IsClusterSupported>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="logstashCount">
            <IsClusterSupported>
              { numeral(get(this.props, 'logstash.node_count')).format('0,0') }
            </IsClusterSupported>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="kibanaCount">
            <IsClusterSupported>
              { numeral(get(this.props, 'kibana.count')).format('0,0') }
            </IsClusterSupported>
          </KuiTableRowCell>
          <KuiTableRowCell data-test-subj="clusterLicense">
            { this.getLicenseInfo() }
          </KuiTableRowCell>
        </KuiTableRow>
      );
    }

  };
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterListing', ($injector) => {
  return {
    restrict: 'E',
    scope: {
      clusters: '=',
      pageIndex: '=',
      filterText: '=',
      sortKey: '=',
      sortOrder: '=',
      onNewState: '=',
    },
    link(scope, $el) {
      const globalState = $injector.get('globalState');
      const kbnUrl = $injector.get('kbnUrl');
      const showLicenseExpiration = $injector.get('showLicenseExpiration');

      scope.$watch('clusters', (clusters = []) => {
        const clusterTable = (
          <MonitoringTable
            className="clusterTable"
            rows={clusters}
            pageIndex={scope.pageIndex}
            filterText={scope.filterText}
            sortKey={scope.sortKey}
            sortOrder={scope.sortOrder}
            onNewState={scope.onNewState}
            placeholder="Filter Clusters..."
            filterFields={filterFields}
            columns={columns}
            rowComponent={clusterRowFactory(scope, globalState, kbnUrl, showLicenseExpiration)}
          />
        );
        render(clusterTable, $el[0]);
      });

    }
  };
});
