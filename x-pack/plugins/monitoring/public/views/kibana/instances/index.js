/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { find, capitalize } from 'lodash';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiLink } from '@elastic/eui';
import { ClusterStatus } from '../../../components/kibana/cluster_status';
import { EuiMonitoringTable } from '../../../components/table';
import { KibanaStatusIcon } from '../../../components/kibana/status_icon';
import { formatMetric, formatNumber } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

const getColumns = (kbnUrl, scope) => ([
  {
    name: i18n.translate('xpack.monitoring.kibana.listing.nameColumnTitle', {
      defaultMessage: 'Name'
    }),
    field: 'kibana.name',
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
    field: 'kibana.status',
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
    field: 'response_times.average',
    render: (value, kibana) => (
      <div>
        <div className="monTableCell__splitNumber">
          { value && (formatNumber(value, 'int_commas') + ' ms avg') }
        </div>
        <div className="monTableCell__splitNumber">
          { formatNumber(kibana.response_times.max, 'int_commas') } ms max
        </div>
      </div>
    )
  }
]);

uiRoutes.when('/kibana/instances', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData,
  },
  controllerAs: 'kibanas',
  controller: class KibanaInstancesList extends MonitoringViewBaseEuiTableController {

    constructor($injector, $scope) {
      super({
        title: 'Kibana Instances',
        storageKey: 'kibana.instances',
        getPageData,
        $scope,
        $injector
      });

      const $route = $injector.get('$route');
      this.data = $route.current.locals.pageData;
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });
      $scope.pageData = $route.current.locals.pageData;

      const kbnUrl = $injector.get('kbnUrl');

      const renderReact = () => {
        const app =  document.getElementById('monitoringKibanaInstancesApp');
        if (!app) {
          return;
        }

        const page = (
          <I18nProvider>
            <EuiPage>
              <EuiPageBody>
                <EuiPageContent>
                  <ClusterStatus stats={$scope.pageData.clusterStatus} />
                  <EuiSpacer size="m"/>
                  <EuiMonitoringTable
                    className="kibanaInstancesTable"
                    rows={this.data.kibanas}
                    columns={getColumns(kbnUrl, $scope)}
                    sorting={{
                      ...this.sorting,
                      sort: {
                        ...this.sorting.sort,
                        field: 'kibana.name'
                      }
                    }}
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
                  />

                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </I18nProvider>
        );

        render(page, app);
      };

      $scope.$watch('data', () => renderReact());
      renderReact();
    }
  }
});
