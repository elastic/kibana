/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize, get } from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import { KibanaStatusIcon } from 'plugins/monitoring/components/kibana/status_icon';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { SORT_ASCENDING } from '../../../../common/constants';
import {
  formatNumber,
  formatMetric,
} from '../../../lib/format_number';
import {
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { I18nContext } from 'ui/i18n';

const filterFields = [ 'kibana.name', 'kibana.host', 'kibana.status', 'kibana.transport_address' ];
const columns = [
  {
    title: i18n.translate('xpack.monitoring.kibana.listing.nameColumnTitle', {
      defaultMessage: 'Name'
    }),
    sortKey: 'kibana.name',
    sortOrder: SORT_ASCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.kibana.listing.statusColumnTitle', {
      defaultMessage: 'Status'
    }),
    sortKey: 'kibana.status'
  },
  {
    title: i18n.translate('xpack.monitoring.kibana.listing.loadAverageColumnTitle', {
      defaultMessage: 'Load Average'
    }),
    sortKey: 'os.load.1m'
  },
  {
    title: i18n.translate('xpack.monitoring.kibana.listing.memorySizeColumnTitle', {
      defaultMessage: 'Memory Size'
    }),
    sortKey: 'process.memory.resident_set_size_in_bytes'
  },
  {
    title: i18n.translate('xpack.monitoring.kibana.listing.requestsColumnTitle', {
      defaultMessage: 'Requests'
    }),
    sortKey: 'requests.total'
  },
  {
    title: i18n.translate('xpack.monitoring.kibana.listing.responseTimeColumnTitle', {
      defaultMessage: 'Response Times'
    }),
    sortKey: 'response_times.average'
  },
];
const instanceRowFactory = (scope, kbnUrl) => {
  const goToInstance = uuid => {
    scope.$evalAsync(() => {
      kbnUrl.changePath(`/kibana/instances/${uuid}`);
    });
  };

  return injectI18n(function KibanaRow(props) {
    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monTableCell__name">
            <EuiLink
              onClick={goToInstance.bind(null, get(props, 'kibana.uuid'))}
              data-test-subj={`kibanaLink-${props.kibana.name}`}
            >
              { props.kibana.name }
            </EuiLink>
          </div>
          <div className="monTableCell__transportAddress">{ get(props, 'kibana.transport_address') }</div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div
            className="monTableCell__status"
            title={
              props.intl.formatMessage({
                id: 'xpack.monitoring.kibana.listing.instanceStatusTitle',
                defaultMessage: 'Instance status: {kibanaStatus}'
              }, {
                kibanaStatus: props.kibana.status
              }
              )
            }
          >
            <KibanaStatusIcon status={props.kibana.status} availability={props.availability} />&nbsp;
            { !props.availability ? (
              <FormattedMessage
                id="xpack.monitoring.kibana.listing.instanceStatus.offlineLabel"
                defaultMessage="Offline"
              />
            ) : capitalize(props.kibana.status) }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__number">
            { formatMetric(get(props, 'os.load["1m"]'), '0.00') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__number">
            { formatNumber(props.process.memory.resident_set_size_in_bytes, 'byte') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__number">
            { formatNumber(props.requests.total, 'int_commas') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__splitNumber">
            { props.response_times.average && (formatNumber(props.response_times.average, 'int_commas') + ' ms avg') }
          </div>
          <div className="monTableCell__splitNumber">
            { formatNumber(props.response_times.max, 'int_commas') } ms max
          </div>
        </KuiTableRowCell>
      </KuiTableRow>
    );
  });
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringKibanaListing', (kbnUrl, i18n) => {
  return {
    restrict: 'E',
    scope: {
      instances: '=',
      pageIndex: '=',
      filterText: '=',
      sortKey: '=',
      sortOrder: '=',
      onNewState: '=',
    },
    link(scope, $el) {
      scope.$on('$destroy', () => $el && $el[0] && unmountComponentAtNode($el[0]));
      const filterInstancesPlaceholder = i18n('xpack.monitoring.kibana.listing.filterInstancesPlaceholder', {
        defaultMessage: 'Filter Instances…'
      });

      scope.$watch('instances', (instances = []) => {
        const kibanasTable = (
          <I18nContext>
            <MonitoringTable
              className="kibanaInstancesTable"
              rows={instances}
              pageIndex={scope.pageIndex}
              filterText={scope.filterText}
              sortKey={scope.sortKey}
              sortOrder={scope.sortOrder}
              onNewState={scope.onNewState}
              placeholder={filterInstancesPlaceholder}
              filterFields={filterFields}
              columns={columns}
              rowComponent={instanceRowFactory(scope, kbnUrl)}
            />
          </I18nContext>
        );
        render(kibanasTable, $el[0]);
      });

    }
  };
});
